/**
 * Build the Android APK.
 *
 *   node native/build-apk.mjs                     -> production, www.kidskolkata.org
 *   node native/build-apk.mjs --url=http://192.168.0.135:3000
 *   node native/build-apk.mjs --release           -> signed release build
 *
 * Or `npm run app:apk -- --url=...`.
 *
 * This exists because `gradlew` needs `java` on the PATH before it can read any
 * configuration at all — so org.gradle.java.home in the Gradle home file, which
 * is the right place for the toolchain, cannot start the wrapper. Rather than
 * set JAVA_HOME permanently on the machine, this finds a JDK 21 and hands it to
 * the one process that needs it.
 *
 * It also passes KIDS_APP_URL through `cap sync`, because the URL is baked into
 * android/app/src/main/assets/capacitor.config.json at sync time. Building
 * without syncing first would quietly ship the previous target — which is the
 * kind of mistake you only find on a student's phone.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_BUILD } from "../src/lib/app/app-build.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const url = flag("url") ?? process.env.KIDS_APP_URL ?? "";
const release = args.includes("--release");

/**
 * The release key. android/app/build.gradle signs with it when
 * android/keystore.properties exists, and produces an UNSIGNED apk when it
 * does not — which is correct for a contributor without the key, and wrong for
 * anybody expecting something installable. So check here and refuse, rather
 * than let an unsigned file land in native/dist/ under a confident name.
 */
const signingFile = join(root, "android", "keystore.properties");
if (release && !existsSync(signingFile)) {
  console.error(`A release build needs the signing key, and android/keystore.properties is not here.
It is gitignored, so it does not travel with the repo - it is on the machine that
made the key, and in whatever backup that key was put in.

To create the key for the first time (once, ever: every later update must be
signed by this same file, or no student can install it over what they have):

  keytool -genkeypair -v -keystore kids-release.jks -alias kids \
          -keyalg RSA -keysize 4096 -validity 10000

Keep the .jks OUTSIDE this tree, back it up somewhere that is not this repo,
then write android/keystore.properties:

  storeFile=C:/path/to/kids-release.jks
  storePassword=...
  keyAlias=kids
  keyPassword=...
`);
  process.exit(1);
}

/** A JDK 21+, from the environment or from where this laptop keeps one. */
function findJdk() {
  const fromEnv = process.env.JAVA_HOME;
  if (fromEnv && existsSync(join(fromEnv, "bin", "java.exe"))) return fromEnv;
  if (fromEnv && existsSync(join(fromEnv, "bin", "java"))) return fromEnv;

  const programs = join(process.env.LOCALAPPDATA ?? "", "Programs");
  if (existsSync(programs)) {
    // Newest first, so a later JDK installed beside this one is preferred.
    const jdk = readdirSync(programs)
      .filter((d) => /^jdk-(2[1-9]|[3-9]\d)/.test(d))
      .sort()
      .reverse()[0];
    if (jdk) return join(programs, jdk);
  }
  return null;
}

/** The Android SDK. */
function findSdk() {
  for (const candidate of [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk"),
  ]) {
    if (candidate && existsSync(join(candidate, "platform-tools"))) return candidate;
  }
  return null;
}

const jdk = findJdk();
if (!jdk) {
  console.error(
    "No JDK 21 found. Capacitor 8 compiles against Java 21.\n" +
      "Install one (Temurin 21 works) and either set JAVA_HOME or put it in\n" +
      "%LOCALAPPDATA%\\Programs\\jdk-21…, which is where this machine keeps its.",
  );
  process.exit(1);
}

const sdk = findSdk();
if (!sdk) {
  console.error("No Android SDK found. Set ANDROID_HOME, or install it via Android Studio.");
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: jdk,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  PATH: `${join(jdk, "bin")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}`,
  ...(url ? { KIDS_APP_URL: url } : {}),
};

const target = url || "https://www.kidskolkata.org";
console.log(`JDK    ${jdk}`);
console.log(`SDK    ${sdk}`);
console.log(`Server ${target}/app`);
console.log(`Build  ${release ? "release (unsigned)" : "debug"}\n`);

const run = (cmd, cmdArgs, cwd) =>
  execFileSync(cmd, cmdArgs, { cwd, env, stdio: "inherit", shell: process.platform === "win32" });

// Tell the no-connection page where the app lives, so its "Try again" goes back
// to the app instead of reloading the error page. Written before `cap sync`,
// which is what copies native/www into the Android project.
writeFileSync(
  join(root, "native", "www", "server.js"),
  `// Generated by native/build-apk.mjs. Not committed — it differs per build.\n` +
    `window.KIDS_SERVER = ${JSON.stringify(`${target}/app`)};\n`,
);

run("npx", ["cap", "sync", "android"], root);

const task = release ? "assembleRelease" : "assembleDebug";
// An absolute path, not a bare name: with shell:true on Windows the working
// directory is not on the PATH, so `gradlew.bat` alone is "not recognized".
// Quoted, because "GADZET ZONE" has a space in it.
const gradlew = join(root, "android", process.platform === "win32" ? "gradlew.bat" : "gradlew");
// APP_BUILD reaches the native side twice and must agree both times: capacitor
// bakes it into the user-agent at sync time, and Gradle needs it as versionCode
// — Android refuses an update whose versionCode is not higher than the
// installed one, so a build number that only lived in the user-agent would
// eventually block its own update.
run(`"${gradlew}"`, [task, `-PkidsBuild=${APP_BUILD}`, "--no-daemon"], join(root, "android"));

// Copy the APK out of Gradle's tree under a name that says what it points at
// AND which build it is. An APK on a phone cannot be asked either question, and
// two identically named files in a downloads folder is how the wrong one gets
// sent to a student — which has already cost an evening.
const built = release
  ? join(root, "android/app/build/outputs/apk/release/app-release.apk")
  : join(root, "android/app/build/outputs/apk/debug/app-debug.apk");

const label = target.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-");
const out = join(root, "native", "dist");
mkdirSync(out, { recursive: true });
const final = join(out, `kids-set-b${APP_BUILD}-${label}${release ? "-release" : "-debug"}.apk`);
copyFileSync(built, final);

console.log(`\nAPK  ${final}`);
console.log(`     build ${APP_BUILD}, pointing at ${target}`);
console.log("     Students on an older build see an update card in the app.");
console.log("     If a build carries something the SERVER needs the phone to have,");
console.log("     bump APP_BUILD in src/lib/app/app-build.ts BEFORE building:");
console.log("     the number is baked into the user-agent at sync time.");
