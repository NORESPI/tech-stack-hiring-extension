// Interface de la popup. Aucune injection HTML avec des données de page : textContent uniquement.
import { scanTechnologies, scanHiring, isScannable, groupByCategory, ATS_ORIGINS } from '../src/app.js';
import { verifyLicense } from '../src/license.js';
import { toCsv, techRows, TECH_COLUMNS, JOB_COLUMNS, exportPayload } from '../src/export.js';

const $ = (id) => document.getElementById(id);
const state = { tab: null, scan: null, hiring: null, pro: false };

function el(tag, props = {}, ...children) {
    const n = document.createElement(tag);
    Object.assign(n, props);
    for (const c of children) n.append(c);
    return n;
}

function safeHref(u) {
    try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null; } catch { return null; }
}

for (const b of document.querySelectorAll('.tab')) {
    b.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === b));
        document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === b.dataset.tab));
    });
}

async function refreshLicense() {
    const { license } = await chrome.storage.local.get('license');
    const res = license ? await verifyLicense(license) : { valid: false };
    state.pro = res.valid;
    $('license-status').textContent = res.valid
        ? `Pro active${res.exp ? ` until ${new Date(res.exp * 1000).toLocaleDateString()}` : ''}.`
        : license ? `Invalid key (${res.reason}). Free plan: technology detection.` : 'Free plan: technology detection.';
    $('hiring-locked').hidden = res.valid;
    $('hiring-open').hidden = !res.valid;
    document.querySelectorAll('.pro-only').forEach((b) => { b.disabled = !res.valid || !state.scan; b.title = res.valid ? '' : 'Pro feature'; });
}

function renderTech(scan) {
    const list = $('tech-list');
    list.replaceChildren();
    if (!scan.technologies.length) { $('tech-status').textContent = 'No known technology detected on this page.'; return; }
    $('tech-status').textContent = `${scan.technologies.length} technologies detected (local scan).`;
    for (const [cat, techs] of groupByCategory(scan.technologies)) {
        list.append(el('h3', { textContent: cat }));
        for (const t of techs) {
            list.append(el('div', { className: 'tech', title: (t.evidence || []).join('\n') },
                el('span', { textContent: t.name + (t.version ? ` ${t.version}` : '') }),
                el('small', { textContent: t.confidence })));
        }
    }
}

function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileBase() {
    try { return new URL(state.scan.url).hostname.replace(/[^\w.-]/g, '_'); } catch { return 'scan'; }
}

$('export-csv').addEventListener('click', () => {
    if (!state.pro || !state.scan) return;
    let csv = toCsv(techRows(state.scan), TECH_COLUMNS);
    if (state.hiring?.jobs?.length) csv += '\n\n' + toCsv(state.hiring.jobs, JOB_COLUMNS);
    download(`${fileBase()}-stack.csv`, csv, 'text/csv');
});
$('export-json').addEventListener('click', () => {
    if (!state.pro || !state.scan) return;
    download(`${fileBase()}-stack.json`, JSON.stringify(exportPayload(state.scan, state.hiring), null, 2), 'application/json');
});

$('hiring-run').addEventListener('click', async () => {
    if (!state.pro || !state.tab) return;
    // Doit rester dans le geste utilisateur : demande des permissions optionnelles avant tout await.
    const granted = await chrome.permissions.request({ origins: ATS_ORIGINS });
    if (!granted) { $('hiring-status').textContent = 'Permission refused: the Hiring tab cannot query the ATS APIs.'; return; }
    $('hiring-run').disabled = true;
    $('hiring-status').textContent = 'Looking for the careers page and ATS…';
    $('hiring-list').replaceChildren();
    $('hiring-signal').replaceChildren();
    const res = await scanHiring({ scripting: chrome.scripting, tab: state.tab, pageHtml: state.scan?.html || '' });
    state.hiring = res;
    $('hiring-run').disabled = false;
    if (res.status === 'not_found') { $('hiring-status').textContent = 'No supported ATS found for this site (Workday and others are not supported).'; return; }
    if (res.status !== 'ok') { $('hiring-status').textContent = `Error: ${res.error || res.status}`; return; }
    $('hiring-status').textContent = `${res.company} · ${res.ats} · ${res.jobs.length} open jobs`;
    const s = res.signal || {};
    const facts = [];
    if (s.openJobs != null) facts.push(`${s.openJobs} open jobs`);
    if (s.postedLast30Days != null) facts.push(`${s.postedLast30Days} posted in 30 days`);
    if (s.byDepartment?.length) facts.push(`top: ${s.byDepartment.slice(0, 3).map((d) => d.department ?? d.name ?? d).join(', ')}`);
    if (facts.length) $('hiring-signal').append(el('p', { className: 'muted', textContent: facts.join(' · ') }));
    for (const j of res.jobs.slice(0, 200)) {
        const href = safeHref(j.url);
        const title = href ? el('a', { href, target: '_blank', rel: 'noopener noreferrer', textContent: j.title }) : el('span', { textContent: j.title });
        $('hiring-list').append(el('li', {}, title, el('span', { className: 'muted', textContent: [j.department, j.location].filter(Boolean).map((x) => ` · ${x}`).join('') })));
    }
    document.querySelectorAll('.pro-only').forEach((b) => { b.disabled = !state.pro; });
});

$('license-save').addEventListener('click', async () => {
    const key = $('license-key').value.trim();
    const res = await verifyLicense(key);
    if (!res.valid) { $('license-status').textContent = `Invalid key (${res.reason}).`; return; }
    await chrome.storage.local.set({ license: key });
    $('license-key').value = '';
    await refreshLicense();
});
$('license-clear').addEventListener('click', async () => {
    await chrome.storage.local.remove('license');
    await refreshLicense();
});

async function main() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    state.tab = tab;
    $('site').textContent = tab?.url ? (() => { try { return new URL(tab.url).hostname; } catch { return tab.url; } })() : '—';
    await refreshLicense();
    if (!tab || !isScannable(tab.url)) { $('tech-status').textContent = 'This page cannot be scanned (browser or store page).'; return; }
    try {
        state.scan = await scanTechnologies(chrome.scripting, tab);
        renderTech(state.scan);
    } catch (e) {
        $('tech-status').textContent = `Scan failed: ${e?.message || e}`;
    }
    await refreshLicense();
}
main();
