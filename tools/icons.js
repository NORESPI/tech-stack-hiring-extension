// Génère les icônes PNG (aucune dépendance) : node tools/icons.js
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(out, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
};

function icon(size) {
    const raw = Buffer.alloc((size * 4 + 1) * size);
    const r = size * 0.2;
    for (let y = 0; y < size; y++) {
        raw[y * (size * 4 + 1)] = 0;
        for (let x = 0; x < size; x++) {
            const i = y * (size * 4 + 1) + 1 + x * 4;
            // carré arrondi bleu + trois barres blanches (pile technique)
            const dx = Math.max(r - x, x - (size - 1 - r), 0), dy = Math.max(r - y, y - (size - 1 - r), 0);
            const inside = dx * dx + dy * dy <= r * r;
            const fy = y / size, fx = x / size;
            const bar = fx > 0.22 && fx < 0.78 && [0.25, 0.45, 0.65].some((b) => fy >= b && fy < b + 0.12);
            const [R, G, B] = bar ? [255, 255, 255] : [58, 91, 217];
            raw[i] = R; raw[i + 1] = G; raw[i + 2] = B; raw[i + 3] = inside ? 255 : 0;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const s of [16, 32, 48, 128]) writeFileSync(join(out, `icon${s}.png`), icon(s));
console.log('icônes écrites dans', out);
