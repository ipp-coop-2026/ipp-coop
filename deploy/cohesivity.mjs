// One-command hosting on a Cohesivity Cloudflare Worker.
//   node deploy/cohesivity.mjs            build, bundle and deploy
//   node deploy/cohesivity.mjs --no-deploy build and bundle only (writes .deploy/worker.js)
// Needs a .cohesivity file (gitignored) at the repo root, or COHESIVITY_FILE=/path/to/.cohesivity.
// Optional server-side secrets, read from the environment at build time and kept out of the
// browser bundle and out of git, only when named: COH_SECRETS=GROQ_API_KEY,ANTHROPIC_API_KEY.
// Worker name: COH_WORKER (default "ipp-coop").
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.deploy');
const worker = process.env.COH_WORKER || 'ipp-coop';
const deploy = !process.argv.includes('--no-deploy');
const run = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });

// 1. Build for Cloudflare (the Lovable default preset).
run('npx -y bun@1.4.0 run build', { NITRO_PRESET: '' });

// 2. Embed the static files so the worker needs no ASSETS binding.
const pub = path.join(root, '.output', 'public');
const TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
const assets = {};
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    const type = TYPES[path.extname(f)];
    if (!type) continue;
    const rel = '/' + path.relative(pub, p).split(path.sep).join('/');
    const text = /^text|svg|json/.test(type);
    assets[rel] = [type, text ? fs.readFileSync(p, 'utf8') : fs.readFileSync(p).toString('base64'), !text];
  }
})(pub);

const secrets = {};
// Only keys named in COH_SECRETS (comma separated) are embedded, e.g. COH_SECRETS=ANTHROPIC_API_KEY.
for (const k of (process.env.COH_SECRETS || '').split(',').map((s) => s.trim()).filter(Boolean)) if (process.env[k]) secrets[k] = process.env[k];

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(root, '.output', 'coh-entry.mjs'), `
import { installStreams } from '${path.join(root, "deploy", "shims", "streams.mjs")}';
installStreams();
import nitro from './server/index.mjs';
const ASSETS = ${JSON.stringify(assets)};
const SECRETS = ${JSON.stringify(secrets)};
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const notFound = { fetch: () => new Response('Not found', { status: 404 }) };
export default {
  async fetch(req, env = {}, ctx) {
    const url = new URL(req.url);
    const hit = ASSETS[url.pathname];
    if (hit && (req.method === 'GET' || req.method === 'HEAD')) {
      const [type, body, binary] = hit;
      const cache = url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
      return new Response(binary ? b64(body) : body, { headers: { 'content-type': type, 'cache-control': cache } });
    }
    globalThis.__IPP_ENV = SECRETS;
    globalThis.process ??= { env: {} };
    globalThis.process.env ??= {};
    for (const [k, v] of Object.entries(SECRETS)) globalThis.process.env[k] = v;
    return nitro.fetch(req, { ...SECRETS, ...env, ASSETS: notFound }, ctx);
  },
};
`);

// 3. Point node:* imports at small shims (Cohesivity workers run without nodejs_compat), then bundle.
const shimDir = path.join(root, "deploy", "shims");
(function patch(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { patch(p); continue; }
    if (!p.endsWith(".mjs")) continue;
    const src = fs.readFileSync(p, "utf8");
    const next = src.replace(/from (["'])node:(process|async_hooks|buffer|stream)\1/g, (_, q, m) => `from ${q}${path.join(shimDir, m + ".mjs")}${q}`);
    if (next !== src) fs.writeFileSync(p, next);
  }
})(path.join(root, ".output", "server"));
run(`npx -y esbuild@0.25.0 .output/coh-entry.mjs --bundle --format=esm --platform=neutral --main-fields=module,main --conditions=workerd,worker,import --minify --outfile=.deploy/worker.js --log-level=warning`);
const code = fs.readFileSync(path.join(out, 'worker.js'), 'utf8');
console.log(`worker.js: ${(code.length / 1024).toFixed(0)} KB, ${Object.keys(assets).length} static files, secrets: ${Object.keys(secrets).join(', ') || 'none'}`);
if (!deploy) process.exit(0);

// 4. Deploy to Cohesivity.
const cfgPath = process.env.COHESIVITY_FILE || path.join(root, '.cohesivity');
const cfg = fs.readFileSync(cfgPath, 'utf8');
const key = /^coh_management_key\s*=\s*(\S+)/m.exec(cfg)?.[1];
if (!key) throw new Error('coh_management_key not found in ' + cfgPath);
const api = (method, p, body) => fetch('https://cohesivity.ai/api/workers' + p, {
  method, headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'ipp-coop-deploy/1.0' },
  body: body ? JSON.stringify(body) : undefined,
});
const status = await api('GET', '/' + worker);
if (status.status === 404) {
  const c = await api('POST', '', { name: worker });
  console.log('create', c.status, (await c.text()).slice(0, 200));
}
const r = await api('PUT', '/' + worker, { code });
const txt = await r.text();
console.log('deploy', r.status, txt.replace(/coh_[A-Za-z0-9_-]+/g, '<key>').slice(0, 400));
if (!r.ok) process.exit(1);
