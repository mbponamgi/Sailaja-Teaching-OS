// lib.mjs — shared plumbing for Sailaja OS browser-verification scripts.
// Owns: Playwright resolution (PW_PATH fallback), the canonical serve recipe
// (python3 http.server on the ONE canonical port, with fail-fast port check
// and cleanup), the persistent profile dir for store tools, and the
// PASS/FAIL checker. Every shipped script imports from here.

import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ── Canonical constants ─────────────────────────────────────────────────
// ONE canonical port for ALL verification runs. localStorage is per-origin
// (scheme + host + port): a run on any other port reads a DIFFERENT store.
// 8931 matches the sailaja-os-change-control pre-commit checklist.
export const PORT = 8931;
export const BASE = `http://localhost:${PORT}`;
export const APP_URL = `${BASE}/index.html`;
// A same-origin URL that runs ZERO app scripts (python http.server returns a
// plain HTML 404 page). Store tools use this so reading/writing localStorage
// never triggers app code (post-fix, loading index.html runs initDatabase()
// which WRITES the store — dumping via the 404 page stays side-effect-free).
export const NO_APP_URL = `${BASE}/__store_probe__`;

// Repo root derived from this file's location:
// <repo>/.claude/skills/sailaja-os-browser-verification/scripts/lib.mjs
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

// Persistent browser profile so seed-store.mjs / dump-store.mjs see the SAME
// localStorage across separate runs. (A default Playwright launch uses a
// throwaway profile whose storage dies with the process.) This profile is a
// test sandbox — it is NOT Sailaja's real browser profile and must never be.
export const PROFILE_DIR = path.join(os.tmpdir(), 'sailaja-os-pw-profile');

export const DB_KEY = 'teach_os_students';
export const DARK_KEY = 'sailaja-dark';

// ── Playwright resolution ───────────────────────────────────────────────
// 1) Normal resolution: `import('playwright')` — works once the repo has its
//    own install (npm init -y && npm i -D playwright && npx playwright install chromium).
// 2) Fallback: PW_PATH env var pointing at ANY machine-local node_modules
//    directory that contains playwright. No machine paths are hardcoded here.
export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch { /* fall through to PW_PATH */ }
  const pwPath = process.env.PW_PATH;
  if (pwPath) {
    try {
      const req = createRequire(path.join(pwPath, '__resolve__.js'));
      return req('playwright');
    } catch (e) {
      console.error(`FATAL: PW_PATH=${pwPath} set but require('playwright') from there failed:\n  ${e.message}`);
      process.exit(2);
    }
  }
  console.error(
`FATAL: playwright not resolvable.
Either install it in this repo (a gated repo change — see SKILL.md §Setup):
  npm init -y && npm i -D playwright && npx playwright install chromium
or point PW_PATH at an existing node_modules dir that contains playwright:
  PW_PATH=/path/to/some/project/node_modules node <script>`);
  process.exit(2);
}

// ── Canonical server ────────────────────────────────────────────────────
function portInUse(port) {
  return new Promise(resolve => {
    const s = net.connect({ port, host: '127.0.0.1' });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
  });
}

// Spawns `python3 -m http.server 8931` from the repo root. Fails fast if the
// port is already taken (an unknown server may be serving a DIFFERENT tree —
// never silently reuse it). Returns { stop } — always call stop() when done.
export async function startServer() {
  if (await portInUse(PORT)) {
    console.error(
`FATAL: port ${PORT} is already in use. Refusing to reuse an unknown server.
Kill it and re-run:  lsof -ti :${PORT} | xargs kill`);
    process.exit(2);
  }
  const proc = spawn('python3', ['-m', 'http.server', String(PORT)],
    { cwd: REPO_ROOT, stdio: 'ignore' });
  let spawnError = null;
  proc.on('error', e => { spawnError = e; });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (spawnError) break;
    if (await portInUse(PORT)) {
      return { stop: () => { try { proc.kill(); } catch { /* already dead */ } } };
    }
    await new Promise(r => setTimeout(r, 100));
  }
  try { proc.kill(); } catch { /* already dead */ }
  console.error(`FATAL: python3 -m http.server ${PORT} did not come up within 5s` +
    (spawnError ? ` (spawn error: ${spawnError.message})` : ''));
  process.exit(2);
}

// ── PASS/FAIL checker ───────────────────────────────────────────────────
// check(name, actual, expected): expected is a literal (strict equal) or a
// predicate function (its .label describes it). Every check prints one line;
// summary() prints the tally and returns the process exit code.
export function makeChecker() {
  const results = [];
  function check(name, actual, expected) {
    const isPredicate = typeof expected === 'function';
    const ok = isPredicate ? !!expected(actual) : Object.is(actual, expected);
    const expShown = isPredicate ? (expected.label ?? 'predicate') : JSON.stringify(expected);
    if (ok) console.log(`PASS  ${name}  (actual: ${JSON.stringify(actual)})`);
    else console.log(`FAIL  ${name}  — expected ${expShown}, got ${JSON.stringify(actual)}`);
    results.push(ok);
    return ok;
  }
  function summary(label) {
    const pass = results.filter(Boolean).length, total = results.length;
    const verdict = pass === total ? 'PASS' : 'FAIL';
    console.log(`\n${verdict}: ${pass}/${total} checks passed (${label})`);
    return pass === total ? 0 : 1;
  }
  return { check, summary };
}

// Attach console-error + pageerror collectors. MUST run before page.goto.
export function collectErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(String(e)));
  return { consoleErrors, pageErrors };
}
