// dump-store.mjs — print (and optionally seed) the persistent test profile's
// localStorage. Usage:
//   node dump-store.mjs                  # print current store, unchanged
//   node dump-store.mjs seed.json        # write seed.json's contents into
//                                        # teach_os_students, then print
//
// Navigates to NO_APP_URL (a same-origin 404 page), NOT index.html — reading
// or seeding the store this way runs ZERO app script, so it never triggers
// initDatabase()'s one-shot first-run seed. Uses the PERSISTENT PROFILE_DIR
// (not a throwaway context) so state survives between separate runs of this
// script — this is a TEST SANDBOX profile, never point it at a real browser
// profile.

import { readFileSync } from 'node:fs';
import { loadPlaywright, startServer, NO_APP_URL, PROFILE_DIR, DB_KEY, DARK_KEY } from './lib.mjs';

const seedPath = process.argv[2];
const seed = seedPath ? JSON.parse(readFileSync(seedPath, 'utf8')) : null;

const { chromium } = await loadPlaywright();
const server = await startServer();

try {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, { timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  await page.goto(NO_APP_URL, { waitUntil: 'load' });

  if (seed) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: DB_KEY, value: seed });
    console.log(`Seeded ${DB_KEY} with ${seed.length} record(s) from ${seedPath}`);
  }

  const students = await page.evaluate(k => localStorage.getItem(k), DB_KEY);
  const dark = await page.evaluate(k => localStorage.getItem(k), DARK_KEY);
  console.log(`${DB_KEY}:`, students);
  console.log(`${DARK_KEY}:`, dark);

  await context.close();
} finally {
  server.stop();
}
