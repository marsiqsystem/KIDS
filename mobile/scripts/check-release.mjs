#!/usr/bin/env node
/**
 * Run before every store build:  node scripts/check-release.mjs
 *
 * A store build carries some things for its whole life — chiefly where it asks
 * for over-the-air updates. A build that goes out without them cannot be fixed
 * by an update, only by another store review, and every phone has to reinstall.
 * So this refuses, with the reason, instead of letting such a build be made.
 *
 * Exit 0 = fit to build. Exit 1 = it prints what is missing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = JSON.parse(fs.readFileSync(path.join(here, "app.json"), "utf8")).expo;
const serverBuild = fs.readFileSync(path.join(here, "..", "src", "lib", "app", "native-build.ts"), "utf8");
const latest = Number(/NATIVE_LATEST = (\d+)/.exec(serverBuild)?.[1]);

const bad = [];
const ok = [];
const check = (pass, good, wrong) => (pass ? ok : bad).push(pass ? good : wrong);

const projectId = app.extra?.eas?.projectId;
check(Boolean(projectId), `Expo project ${projectId}: updates come from u.expo.dev`, "No Expo project id (extra.eas.projectId). Run `npx eas-cli@latest init` signed in to the company's Expo account. Without it this build can never take an update.");
check(app.runtimeVersion?.policy === "appVersion", "runtimeVersion follows the app version", "runtimeVersion must be { policy: \"appVersion\" }.");
check(Boolean(process.env.GOOGLE_SERVICES_JSON) || fs.existsSync(path.join(here, "google-services.json")), "google-services.json present: Android push works", "mobile/google-services.json is missing (Firebase console, Android app org.kidskolkata.set). Without it no phone ever gets a notice.");

const code = app.android?.versionCode;
check(String(code) === String(app.ios?.buildNumber), `Android and iPhone both build ${code}`, `android.versionCode (${code}) and ios.buildNumber (${app.ios?.buildNumber}) differ.`);
check(code > latest, `Build ${code} is above the server's NATIVE_LATEST ${latest}`, `Build ${code} is not above NATIVE_LATEST ${latest} in src/lib/app/native-build.ts. Raise versionCode and ios.buildNumber.`);

check(app.extra?.apiUrl === "https://www.kidskolkata.org", "Talks to https://www.kidskolkata.org", `extra.apiUrl is ${app.extra?.apiUrl}, not the live site.`);
for (const name of ["EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_E2E", "KIDS_WEB_TEST"]) {
  check(!process.env[name], `${name} not set`, `${name} is set in this shell. It is for testing only; close this terminal and build from a fresh one.`);
}

for (const line of ok) console.log(`  ok    ${line}`);
for (const line of bad) console.log(`  STOP  ${line}`);
console.log(bad.length ? `\nNot fit for the store: ${bad.length} to fix.` : "\nFit for a store build.");
process.exit(bad.length ? 1 : 0);
