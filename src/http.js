// Client HTTP de l'extension, même interface que actors/ats-jobs-by-company/src/http.js
// (json(url) / text(url) / xml(url) ; null sur 404). Pas de retry sur 403/429 : on s'arrête.
// - URL de la page active : HTML déjà collecté (aucune requête).
// - Même origine que la page active : pageFetch (exécuté dans l'onglet, comme une visite normale).
// - API publiques des ATS : fetch depuis l'extension (permissions d'hôte optionnelles).

export class HttpError extends Error {
    constructor(status, url) {
        super(`HTTP ${status} on ${url}`);
        this.status = status;
        this.url = url;
    }
}

export function createHttp({ pageUrl = null, pageHtml = null, pageFetch = null, fetchImpl = globalThis.fetch, timeoutMs = 15000, maxRequests = 40 } = {}) {
    let origin = null;
    try { origin = pageUrl ? new URL(pageUrl).origin : null; } catch { /* ignore */ }
    let count = 0;

    async function raw(url, accept) {
        if (++count > maxRequests) throw new Error('request budget exceeded');
        if (pageUrl && pageHtml != null && url === pageUrl) return { status: 200, text: pageHtml, finalUrl: pageUrl };
        let sameOrigin = false;
        try { sameOrigin = origin && new URL(url).origin === origin; } catch { /* ignore */ }
        if (sameOrigin && pageFetch) {
            const [r] = await pageFetch([url]);
            return { status: r?.status || 0, text: r?.text ?? null, finalUrl: r?.finalUrl || url };
        }
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            const res = await fetchImpl(url, { headers: { accept }, credentials: 'omit', signal: ctrl.signal });
            const text = res.status === 200 || (res.status > 200 && res.status < 300) ? await res.text() : null;
            return { status: res.status, text, finalUrl: res.url || url };
        } finally {
            clearTimeout(t);
        }
    }

    async function textLike(url, accept) {
        const r = await raw(url, accept);
        if (r.status === 404 || r.status === 410) return null;
        if (r.status < 200 || r.status >= 300 || r.text == null) throw new HttpError(r.status, url);
        return { text: r.text, finalUrl: r.finalUrl, status: r.status };
    }

    return {
        get requests() { return count; },
        async json(url) {
            const r = await textLike(url, 'application/json');
            if (!r) return null;
            try { return JSON.parse(r.text); } catch { throw new Error(`invalid JSON from ${url}`); }
        },
        text: (url) => textLike(url, 'text/html,application/xhtml+xml'),
        xml: (url) => textLike(url, 'application/xml,application/rss+xml,text/xml'),
    };
}
