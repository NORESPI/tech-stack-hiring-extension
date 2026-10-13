import { FINGERPRINTS, CATEGORIES } from './fingerprints.js';

const MAX_EVIDENCE = 160;

function short(s) {
    s = String(s);
    return s.length > MAX_EVIDENCE ? `${s.slice(0, MAX_EVIDENCE - 1)}…` : s;
}

function firstMatch(re, list) {
    for (const v of list) {
        const m = re.exec(v);
        if (m) return { value: v, version: m[1] || null };
    }
    return null;
}

function cleanVersion(v) {
    if (v == null || v === true) return null;
    const s = String(v).trim();
    const m = s.match(/^v?(\d+(?:\.\d+){0,3}(?:[-+][\w.]+)?)/);
    return m ? m[1] : null;
}

/**
 * signals : { url, scripts[], links[], metas: {nom: [contenus]}, html, globals: {chemin: valeur|true},
 *             dom: [sélecteurs trouvés], attrs: {"sel|attr": valeur}, flags: {reactFiber, vueApp} }
 * Renvoie [{ name, category, version, confidence, evidence[] }] trié par catégorie puis nom.
 */
export function detectTechnologies(signals, fps = FINGERPRINTS) {
    const s = {
        scripts: (signals.scripts || []).map(String),
        links: (signals.links || []).map(String),
        metas: signals.metas || {},
        html: String(signals.html || ''),
        globals: signals.globals || {},
        dom: new Set(signals.dom || []),
        attrs: signals.attrs || {},
        flags: signals.flags || {},
    };
    const found = new Map();
    for (const f of fps) {
        const evidence = [];
        let version = null;
        let strong = false;
        if (f.scripts) {
            const m = firstMatch(f.scripts, s.scripts);
            if (m) { evidence.push(`script: ${short(m.value)}`); version ||= m.version; }
        }
        if (f.links) {
            const m = firstMatch(f.links, s.links);
            if (m) { evidence.push(`link: ${short(m.value)}`); version ||= m.version; }
        }
        if (f.meta) {
            for (const [name, re] of Object.entries(f.meta)) {
                const m = firstMatch(re, s.metas[name] || []);
                if (m) { evidence.push(`meta ${name}: ${short(m.value)}`); version ||= m.version; strong = true; }
            }
        }
        if (f.html) {
            const m = f.html.exec(s.html);
            if (m) { evidence.push(`html: ${short(m[0])}`); version ||= m[1] || null; }
        }
        for (const g of f.globals || []) {
            if (s.globals[g] !== undefined && s.globals[g] !== null && s.globals[g] !== false) {
                evidence.push(`global: ${g}`);
                strong = true;
                break;
            }
        }
        for (const sel of f.dom || []) {
            if (s.dom.has(sel)) { evidence.push(`dom: ${sel}`); strong = true; break; }
        }
        for (const fl of f.flags || []) {
            if (s.flags[fl]) { evidence.push(`runtime: ${fl}`); strong = true; break; }
        }
        if (!evidence.length) continue;
        if (typeof f.version === 'string') version = cleanVersion(s.globals[f.version]) || version;
        else if (f.version && typeof f.version === 'object') version = cleanVersion(s.attrs[`${f.version.selector}|${f.version.attr}`]) || version;
        found.set(f.name, {
            name: f.name,
            category: f.category,
            version: cleanVersion(version),
            confidence: strong || evidence.length >= 2 ? 'high' : 'medium',
            evidence,
        });
    }
    // implications (ex. Next.js -> React), sans écraser une détection directe
    for (const f of fps) {
        if (!found.has(f.name) || !f.implies) continue;
        for (const imp of f.implies) {
            if (found.has(imp)) continue;
            const target = fps.find((x) => x.name === imp);
            found.set(imp, { name: imp, category: target?.category || 'Other', version: null, confidence: 'medium', evidence: [`implied by ${f.name}`] });
        }
    }
    const order = (c) => { const i = CATEGORIES.indexOf(c); return i < 0 ? 999 : i; };
    return [...found.values()].sort((a, b) => order(a.category) - order(b.category) || a.name.localeCompare(b.name));
}

export function groupByCategory(techs) {
    const out = new Map();
    for (const t of techs) {
        if (!out.has(t.category)) out.set(t.category, []);
        out.get(t.category).push(t);
    }
    return out;
}
