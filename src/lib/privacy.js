// Aucune donnée personnelle dans la sortie (règle NORESPI) : les descriptions d'offres contiennent
// parfois l'e-mail du recruteur ou un lien vers son profil (LinkedIn /in/, Calendly…).
// Copie de redactEmails / isPersonalUrl d'actors/hn-who-is-hiring/src/parse.js : chaque Actor est
// construit seul dans son image Docker, l'import entre dossiers n'est donc pas possible.
// Toute correction ici doit être reportée là-bas (et dans mcp/ats-jobs-mcp/src/privacy.js).

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const OBF_EMAIL_RE = /\b[\w.+-]+\s*(?:\[at\]|\(at\)|\{at\})\s*[\w.-]+(?:\s*(?:\[dot\]|\(dot\)|\{dot\})\s*[\w-]+)*/gi;

const PERSONAL_URL_RE = /^(?:https?:\/\/)?(?:[\w-]+\.)?(?:linkedin\.com\/(?:in|pub)\/|(?:twitter|x)\.com\/(?!(?:i|home|search|hashtag)\b)[\w]+\/?$|calendly\.com\/|cal\.com\/|bsky\.app\/profile\/|t\.me\/|wa\.me\/)/i;
const PERSONAL_URL_G = /(?:https?:\/\/)?(?:[\w-]+\.)?(?:linkedin\.com\/(?:in|pub)\/[^\s)]+|calendly\.com\/[^\s)]+|cal\.com\/[^\s)]+|bsky\.app\/profile\/[^\s)]+|t\.me\/[^\s)]+|wa\.me\/[^\s)]+|(?:twitter|x)\.com\/\w+\/?(?=[\s).,]|$))/gi;

export function isPersonalUrl(u) {
    const s = String(u || '').trim();
    return PERSONAL_URL_RE.test(s) || /^mailto:/i.test(s);
}

export function redactEmails(s) {
    if (s === null || s === undefined) return s;
    return String(s)
        .replace(PERSONAL_URL_G, '[personal link removed]')
        .replace(/mailto:\S+/gi, '[email removed]')
        .replace(EMAIL_RE, '[email removed]')
        .replace(OBF_EMAIL_RE, '[email removed]');
}

// Téléphones au format international (« +33 6 12 34 56 78 », « +1 (415) 555-0100 »), comme dans ats-jobs-mcp.
const PHONE_RE = /\+\d{1,3}(?:[\s.-]?\(?\d{1,4}\)?){2,6}/g;

export function redactPersonal(s) {
    if (s === null || s === undefined) return s;
    return redactEmails(s).replace(PHONE_RE, '[phone removed]');
}

const TEXT_FIELDS = ['title', 'department', 'team', 'location', 'descriptionText'];
const URL_FIELDS = ['url', 'applyUrl'];

// Masque les textes libres et retire les URL de profils personnels d'une offre normalisée.
export function sanitizeJob(job) {
    const out = { ...job };
    for (const k of TEXT_FIELDS) {
        if (typeof out[k] === 'string') out[k] = redactPersonal(out[k]);
    }
    for (const k of URL_FIELDS) {
        if (out[k] && isPersonalUrl(out[k])) out[k] = null;
    }
    return out;
}
