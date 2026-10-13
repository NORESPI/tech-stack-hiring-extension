import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scanTechnologies, scanHiring, isScannable, ATS_ORIGINS } from '../src/app.js';
import { collectDom, collectRuntime, fetchSameOrigin } from '../src/collect.js';
import { verifyLicense } from '../src/license.js';
import { toCsv } from '../src/export.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));

test('manifest V3, permissions minimales, aucun hôte obligatoire', () => {
    assert.equal(manifest.manifest_version, 3);
    assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'scripting', 'storage']);
    assert.equal(manifest.host_permissions, undefined);
    assert.equal(manifest.content_scripts, undefined);
    assert.equal(manifest.background, undefined);
    assert.deepEqual([...manifest.optional_host_permissions].sort(), [...ATS_ORIGINS].sort());
    assert.ok(!ATS_ORIGINS.some((o) => /workday/i.test(o)), 'Workday interdit');
});

test('fichiers référencés présents, pas de script distant ni inline', () => {
    const files = [manifest.action.default_popup, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
    for (const f of files) assert.ok(existsSync(join(root, f)), f);
    const html = readFileSync(join(root, manifest.action.default_popup), 'utf8');
    for (const m of html.matchAll(/<script[^>]*>/g)) assert.match(m[0], /src="[^":]+\.js"/);
    assert.doesNotMatch(html, /https?:\/\/[^"]*\.js/);
});

test('aucun envoi réseau hors ATS : pas de fetch vers un serveur à nous', () => {
    const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
    const src = [...walk(join(root, 'src')), ...walk(join(root, 'popup'))].filter((f) => f.endsWith('.js'));
    for (const f of src) {
        const code = readFileSync(f, 'utf8');
        assert.doesNotMatch(code, /https?:\/\/[^'"\s]*norespi|sendBeacon|XMLHttpRequest|\/g\/collect|\/collect\?/i, f);
        assert.doesNotMatch(code, /\beval\(|new Function\(/, f);
    }
    const popup = readFileSync(join(root, 'popup/popup.js'), 'utf8');
    assert.doesNotMatch(popup, /innerHTML/);
});

test('isScannable refuse les pages internes', () => {
    assert.equal(isScannable('https://example.com/'), true);
    assert.equal(isScannable('chrome://extensions'), false);
    assert.equal(isScannable('https://chromewebstore.google.com/detail/x'), false);
});

function fakeScripting(results) {
    return {
        calls: [],
        async executeScript(opts) {
            this.calls.push(opts);
            const r = results.get(opts.func);
            return [{ result: typeof r === 'function' ? r(...(opts.args || [])) : r }];
        },
    };
}

test('scanTechnologies : WordPress, React, Google Analytics détectés avec preuves', async () => {
    const scripting = fakeScripting(new Map([
        [collectDom, {
            url: 'https://shop.example.com/',
            html: '<html><head><meta name="generator" content="WordPress 6.4.2"></head></html>',
            scripts: ['https://shop.example.com/wp-includes/js/jquery/jquery.min.js', 'https://www.googletagmanager.com/gtag/js?id=G-XXXX'],
            metas: { generator: ['WordPress 6.4.2'] },
            dom: ['[data-reactroot]'],
            attrs: {},
            links: [],
        }],
        [collectRuntime, { globals: { 'React.version': '18.2.0' }, flags: { reactFiber: true } }],
        [fetchSameOrigin, []],
    ]));
    const scan = await scanTechnologies(scripting, { id: 1, url: 'https://shop.example.com/' });
    const names = scan.technologies.map((t) => t.name);
    assert.ok(names.includes('WordPress'), names.join(','));
    assert.ok(names.includes('React'), names.join(','));
    const wp = scan.technologies.find((t) => t.name === 'WordPress');
    assert.equal(wp.version, '6.4.2');
    assert.ok(wp.evidence?.length);
    for (const c of scripting.calls) assert.deepEqual(c.target, { tabId: 1 });
});

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

test('scanHiring Greenhouse : offres, lien source, données personnelles masquées', async () => {
    const urls = [];
    const fetchImpl = async (u) => {
        urls.push(String(u));
        if (String(u).includes('/departments')) return json({ departments: [] });
        if (String(u).includes('/jobs')) return json({ jobs: [{
            id: 42, title: 'Backend Engineer – contact jane.doe@acme.com', updated_at: '2026-10-01T00:00:00Z', first_published: '2026-10-01T00:00:00Z',
            absolute_url: 'https://boards.greenhouse.io/acme/jobs/42', location: { name: 'Remote' }, departments: [{ name: 'Engineering' }],
            content: '&lt;p&gt;Call +1 415 555 0134 or see linkedin.com/in/janedoe&lt;/p&gt;',
        }] });
        return json({ name: 'Acme' });
    };
    const scripting = fakeScripting(new Map([[fetchSameOrigin, []]]));
    const res = await scanHiring({ scripting, tab: { id: 1, url: 'https://boards.greenhouse.io/acme' }, fetchImpl, now: new Date('2026-10-13T00:00:00Z') });
    assert.equal(res.status, 'ok', JSON.stringify(res));
    assert.equal(res.jobs.length, 1);
    const blob = JSON.stringify(res);
    assert.doesNotMatch(blob, /jane\.doe@acme\.com|555 0134|linkedin\.com\/in\/janedoe/);
    assert.match(res.jobs[0].url, /^https:\/\/boards\.greenhouse\.io\/acme\/jobs\/42/);
    assert.ok(urls.every((u) => u.startsWith('https://boards-api.greenhouse.io/')), urls.join('\n'));
});

test('scanHiring : arrêt sur 429, pas de nouvelle tentative', async () => {
    const urls = [];
    const fetchImpl = async (u) => { urls.push(String(u)); return json({}, 429); };
    const scripting = fakeScripting(new Map([[fetchSameOrigin, []]]));
    const res = await scanHiring({ scripting, tab: { id: 1, url: 'https://boards.greenhouse.io/acme' }, fetchImpl });
    assert.notEqual(res.status, 'ok');
    assert.equal(new Set(urls).size, urls.length, 'aucune URL demandée deux fois');
});

test('licence : clé émise valide, clé modifiée refusée', async () => {
    const out = execFileSync(process.execPath, [join(root, 'tools/license.js'), 'issue', '--days', '30'], { encoding: 'utf8' });
    const key = out.match(/TSH1\.[\w-]+\.[\w-]+/)?.[0];
    assert.ok(key, out);
    assert.equal((await verifyLicense(key)).valid, true);
    const parts = key.split('.');
    const sig = parts[2];
    const bad = [parts[0], parts[1], (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1)].join('.');
    assert.equal((await verifyLicense(bad)).valid, false);
    assert.equal((await verifyLicense('n importe quoi')).valid, false);
    assert.doesNotMatch(Buffer.from(parts[1], 'base64url').toString(), /@/);
});

test('export CSV : formules neutralisées', () => {
    const csv = toCsv([{ name: '=HYPERLINK("x")', v: '+1' }], ['name', 'v']);
    assert.doesNotMatch(csv, /(^|,|")=HYPERLINK/m);
    assert.doesNotMatch(csv, /(^|,)\+1/m);
});
