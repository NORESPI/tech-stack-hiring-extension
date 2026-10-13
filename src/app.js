// Orchestration indépendante de l'interface : testable sous Node avec un faux chrome.scripting.
import { collectorSpec } from './tech/fingerprints.js';
import { detectTechnologies } from './tech/detect.js';
import { collectDom, collectRuntime, fetchSameOrigin } from './collect.js';
import { createHttp } from './http.js';
import { parseCompanyInput, detectFromSite } from './lib/detect.js';
import { fetchAts, toOutputJobs, hiringSignal } from './lib/ats.js';

export const MAX_HTML = 600_000;

// API publiques des ATS (lecture seule). Demandées seulement à l'ouverture de l'onglet Recrutement
// (optional_host_permissions). Workday exclu (conditions).
export const ATS_ORIGINS = [
    'https://boards-api.greenhouse.io/*',
    'https://api.lever.co/*',
    'https://api.eu.lever.co/*',
    'https://api.ashbyhq.com/*',
    'https://*.recruitee.com/*',
    'https://apply.workable.com/*',
    'https://api.smartrecruiters.com/*',
    'https://*.teamtailor.com/*',
    'https://*.jobs.personio.de/*',
    'https://*.jobs.personio.com/*',
];

/** Pages où Chrome interdit l'injection, ou sans intérêt. */
export function isScannable(url) {
    let u;
    try { u = new URL(url); } catch { return false; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (u.hostname === 'chromewebstore.google.com') return false;
    if (u.hostname === 'chrome.google.com' && u.pathname.startsWith('/webstore')) return false;
    return true;
}

/** Détection des technologies de l'onglet actif (gratuit). Tout reste local. */
export async function scanTechnologies(scripting, tab, now = new Date()) {
    const spec = collectorSpec();
    const [dom] = await scripting.executeScript({ target: { tabId: tab.id }, func: collectDom, args: [spec, MAX_HTML] });
    let runtime = {};
    try {
        const [rt] = await scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: collectRuntime, args: [spec.globals] });
        runtime = rt?.result || {};
    } catch { /* page qui refuse le monde MAIN : on continue avec le DOM */ }
    const signals = { ...(dom?.result || {}), ...runtime };
    return {
        url: tab.url,
        title: tab.title || '',
        scannedAt: now.toISOString(),
        html: signals.html || '',
        technologies: detectTechnologies(signals),
    };
}

/** Onglet Recrutement (Pro) : détecte l'ATS du site et lit les offres via l'API publique de l'ATS. */
export async function scanHiring({ scripting, tab, pageHtml = '', fetchImpl = globalThis.fetch, now = new Date(), maxRequests = 40 }) {
    const pageFetch = async (urls) => {
        const [r] = await scripting.executeScript({ target: { tabId: tab.id }, func: fetchSameOrigin, args: [urls, MAX_HTML] });
        return r?.result || [];
    };
    const http = createHttp({ pageUrl: tab.url, pageHtml, pageFetch, fetchImpl, maxRequests });
    const parsed = parseCompanyInput(tab.url);
    let target = null;
    try {
        if (parsed?.kind === 'ats-url') target = { ats: parsed.ats, id: parsed.id, detectionMethod: 'ats-url' };
        else if (parsed?.kind === 'site') target = await detectFromSite(http, parsed, { fetchAts, guessFromDomain: true });
    } catch (e) {
        return { status: 'error', error: String(e?.message || e), requests: http.requests };
    }
    if (!target) return { status: 'not_found', requests: http.requests };
    let res;
    try {
        res = await fetchAts(http, target.ats, target.id, {});
    } catch (e) {
        return { status: 'error', ats: target.ats, error: String(e?.message || e), requests: http.requests };
    }
    if (!res || !Array.isArray(res.jobs)) return { status: 'not_found', ats: target.ats, requests: http.requests };
    const ctx = {
        company: res.company || target.id,
        ats: target.ats,
        id: target.id,
        total: res.total ?? res.jobs.length,
        detectionMethod: target.detectionMethod || null,
        input: tab.url,
        scrapedAt: now.toISOString(),
        returned: res.jobs.length,
    };
    const jobs = toOutputJobs(res.jobs, ctx, { includeDescription: false });
    const signal = hiringSignal(res.jobs, ctx, {}, now);
    return { status: 'ok', ats: target.ats, atsCompanyId: target.id, company: ctx.company, detectionMethod: ctx.detectionMethod, jobs, signal, requests: http.requests };
}

/** Regroupe les technologies par catégorie pour l'affichage. */
export function groupByCategory(techs) {
    const groups = new Map();
    for (const t of techs) {
        if (!groups.has(t.category)) groups.set(t.category, []);
        groups.get(t.category).push(t);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
