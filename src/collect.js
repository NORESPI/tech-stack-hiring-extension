// Fonctions injectées dans l'onglet actif par chrome.scripting.executeScript (activeTab).
// Elles doivent rester autonomes (aucune variable extérieure) : Chrome les sérialise.
// Elles ne lisent que la structure technique de la page ; rien n'est envoyé hors du navigateur.

/** Monde ISOLATED : URL, scripts, liens, meta, HTML tronqué, sélecteurs et attributs. */
export function collectDom(spec, maxHtml) {
    const abs = (u) => { try { return new URL(u, location.href).href; } catch { return String(u || ''); } };
    const scripts = [...document.scripts].map((s) => s.src).filter(Boolean).map(abs).slice(0, 500);
    const links = [...document.querySelectorAll('link[href]')].map((l) => abs(l.getAttribute('href'))).slice(0, 500);
    const metas = {};
    for (const m of document.querySelectorAll('meta[name], meta[property]')) {
        const k = (m.getAttribute('name') || m.getAttribute('property') || '').toLowerCase();
        if (!k) continue;
        (metas[k] ||= []).push(m.getAttribute('content') || '');
    }
    const dom = [];
    for (const sel of spec.selectors || []) {
        try { if (document.querySelector(sel)) dom.push(sel); } catch { /* sélecteur invalide */ }
    }
    const attrs = {};
    for (const a of spec.attrs || []) {
        try {
            const el = document.querySelector(a.selector);
            if (el) attrs[`${a.selector}|${a.attr}`] = el.getAttribute(a.attr);
        } catch { /* ignore */ }
    }
    const html = document.documentElement ? document.documentElement.outerHTML.slice(0, maxHtml || 600000) : '';
    return { url: location.href, title: document.title, scripts, links, metas, dom, attrs, html };
}

/** Monde MAIN : présence de variables globales (et version si c'est une chaîne), indices React/Vue. */
export function collectRuntime(paths) {
    const globals = {};
    for (const p of paths || []) {
        try {
            let v = window;
            for (const k of p.split('.')) {
                if (v == null) { v = undefined; break; }
                v = v[k];
            }
            if (v === undefined || v === null) continue;
            globals[p] = typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 40) : true;
        } catch { /* accès refusé */ }
    }
    const flags = { reactFiber: false, vueApp: false };
    try {
        const els = document.querySelectorAll('body, body > *, body > * > *');
        for (let i = 0; i < els.length && i < 300; i++) {
            const keys = Object.keys(els[i]);
            if (keys.some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$') || k === '_reactRootContainer')) flags.reactFiber = true;
            if (els[i].__vue_app__ || els[i].__vue__) flags.vueApp = true;
        }
    } catch { /* ignore */ }
    return { globals, flags };
}

/** Monde ISOLATED : récupère des pages du MÊME site (page carrière), comme le ferait l'utilisateur. */
export async function fetchSameOrigin(urls, maxChars) {
    const out = [];
    for (const u of (urls || []).slice(0, 4)) {
        try {
            const url = new URL(u, location.href);
            if (url.origin !== location.origin) { out.push({ url: u, status: 0, text: null }); continue; }
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 10000);
            const res = await fetch(url.href, { credentials: 'omit', redirect: 'follow', signal: ctrl.signal });
            clearTimeout(t);
            const text = res.ok ? (await res.text()).slice(0, maxChars || 600000) : null;
            out.push({ url: u, status: res.status, finalUrl: res.url, text });
        } catch {
            out.push({ url: u, status: 0, text: null });
        }
    }
    return out;
}
