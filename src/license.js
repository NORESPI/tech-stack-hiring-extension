// Licence Pro vérifiée hors ligne : signature ECDSA P-256 (WebCrypto), aucune requête réseau.
// Format : TSH1.<payload base64url>.<signature base64url>, payload = {"v":1,"plan":"pro","sub":"<id aléatoire>","iat":<epoch s>,"exp":<epoch s|absent>}
// Aucune donnée personnelle dans la clé (sub = identifiant aléatoire, pas d'e-mail).
import { PUBLIC_JWK } from './license-public.js';

const PREFIX = 'TSH1';

export function b64urlEncode(bytes) {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(str) {
    const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIG = { name: 'ECDSA', hash: 'SHA-256' };

/** Vérifie une clé. Retourne { valid, plan, sub, exp, reason }. */
export async function verifyLicense(key, { publicJwk = PUBLIC_JWK, now = Date.now() } = {}) {
    try {
        if (!publicJwk) return { valid: false, reason: 'no_public_key' };
        const parts = String(key || '').trim().split('.');
        if (parts.length !== 3 || parts[0] !== PREFIX) return { valid: false, reason: 'format' };
        const payloadBytes = b64urlDecode(parts[1]);
        const sig = b64urlDecode(parts[2]);
        const pub = await crypto.subtle.importKey('jwk', publicJwk, ALG, false, ['verify']);
        const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
        const ok = await crypto.subtle.verify(SIG, pub, sig, signed);
        if (!ok) return { valid: false, reason: 'signature' };
        const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
        if (payload.v !== 1 || payload.plan !== 'pro') return { valid: false, reason: 'plan' };
        if (payload.exp && payload.exp * 1000 < now) return { valid: false, reason: 'expired', exp: payload.exp };
        return { valid: true, plan: payload.plan, sub: payload.sub, exp: payload.exp || null };
    } catch {
        return { valid: false, reason: 'format' };
    }
}

/** Signe une clé (outil vendeur uniquement, jamais exécuté dans l'extension). */
export async function signLicense(privateJwk, { sub, exp = null, iat = Math.floor(Date.now() / 1000) } = {}) {
    const payload = { v: 1, plan: 'pro', sub, iat };
    if (exp) payload.exp = exp;
    const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
    const priv = await crypto.subtle.importKey('jwk', privateJwk, ALG, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign(SIG, priv, new TextEncoder().encode(`${PREFIX}.${body}`)));
    return `${PREFIX}.${body}.${b64urlEncode(sig)}`;
}
