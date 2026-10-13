#!/usr/bin/env node
// Outil vendeur : node tools/license.js init | issue [--days N]
// La clé privée est stockée HORS du dossier de l'extension (jamais poussée) :
//   $TSH_KEY_DIR ou <racine entreprise>/secrets/tech-stack-hiring/private.jwk
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { signLicense } from '../src/license.js';

const here = dirname(fileURLToPath(import.meta.url));
const keyDir = process.env.TSH_KEY_DIR || resolve(here, '../../../secrets/tech-stack-hiring');
const privPath = join(keyDir, 'private.jwk');
const pubModule = resolve(here, '../src/license-public.js');

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'init') {
    if (existsSync(privPath)) { console.error(`Clé déjà présente : ${privPath}`); process.exit(1); }
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
    mkdirSync(keyDir, { recursive: true, mode: 0o700 });
    writeFileSync(privPath, JSON.stringify(priv), { mode: 0o600 });
    const { kty, crv, x, y } = pub;
    writeFileSync(pubModule, `// Clé publique de vérification des licences (générée par tools/license.js init).\nexport const PUBLIC_JWK = ${JSON.stringify({ kty, crv, x, y })};\n`);
    console.log(`Clé privée : ${privPath}\nClé publique écrite dans src/license-public.js`);
} else if (cmd === 'issue') {
    const i = rest.indexOf('--days');
    const days = i >= 0 ? Number(rest[i + 1]) : 0;
    const priv = JSON.parse(readFileSync(privPath, 'utf8'));
    const exp = days > 0 ? Math.floor(Date.now() / 1000) + days * 86400 : null;
    console.log(await signLicense(priv, { sub: randomUUID(), exp }));
} else {
    console.log('Usage : node tools/license.js init | issue [--days N]');
}
