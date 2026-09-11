# The Android app

A Capacitor shell around the student app that already exists in `src/app/app`.
It loads those 40 screens from the server into its own WebView, so there is no
second copy of the daily loop, the question bank or the record screens to keep
in step with the first.

## Build one

```bash
npm run app:apk -- --url=http://192.168.0.135:3000   # this laptop, for testing
npm run app:apk -- --url=https://<branch>.vercel.app # a Vercel preview
npm run app:apk                                      # production, debug-signed
npm run app:apk -- --release                         # production, SIGNED — the
                                                     # only one to give a student
```

The APK lands in `native/dist/`, named after the server it points at — an APK
on a phone cannot be asked which server it was built for, and two identically
named files in a downloads folder is how the wrong one reaches a student.

`native/build-apk.mjs` finds the JDK and the Android SDK itself. It needs:

* **JDK 21** — Capacitor 8 compiles against it. This machine's is at
  `%LOCALAPPDATA%\Programs\jdk-21.0.12.1+1`; set `JAVA_HOME` if yours is
  elsewhere. (There is also a JDK **17** on this laptop, bundled inside an
  unrelated application. The build must not depend on it — it would vanish the
  day that application is uninstalled, and 17 cannot compile Capacitor 8.)
* **Android SDK** with platform 35 — at `%LOCALAPPDATA%\Android\Sdk` here.
* `android/local.properties` pointing at that SDK, with **forward slashes**: in
  a Java properties file `C:\Users` reads as a broken `\u` escape.
* For `--release`, **`android/keystore.properties`** — see *Signing* below. The
  build refuses `--release` without it rather than produce an unsigned APK that
  no phone will install.

On another laptop, both of those have to exist there too, and
`~/.gradle/gradle.properties` needs its `org.gradle.java.home` line corrected.

## Signing

A release APK is signed with `kids-release.jks` — made 11 Sep 2026, alias
`kids`, RSA 4096, valid until 2054. **It is the app's identity.** Android only
installs an update over an app when both carry the same signature, so losing the
key strands every student who has already installed, and leaking it lets anyone
sign an APK that Android accepts as this one.

It is **not in this repo and never will be** — the repo is public, and `*.jks`,
`*.keystore` and `keystore.properties` are gitignored in both `.gitignore` and
`android/.gitignore`. It lives outside the tree in
`Desktop\SET 2026\KIDS app signing key\`, with a `READ ME FIRST.txt` beside it
carrying the password and saying why a backup off this laptop matters.

The build finds it through `android/keystore.properties`, also gitignored:

```properties
storeFile=C:/.../kids-release.jks
storePassword=...
keyAlias=kids
keyPassword=...
```

On another machine, both the `.jks` and that file have to be copied across.
`build-apk.mjs --release` prints the `keytool` line when the file is missing —
but **do not run it**: a second key is a different app, and a phone carrying the
first one can never be updated from it.

`versionCode` comes from `APP_BUILD` in `src/lib/app/app-build.ts`, passed to
Gradle as `-PkidsBuild`. That is the same number the user-agent carries, so the
version check and Android's own update rule cannot disagree. Android refuses an
update whose `versionCode` is not higher than the installed one, so **bump
`APP_BUILD` before building any APK meant to replace one already on a phone.**

Check what came out, before sending it anywhere:

```bash
"$ANDROID_HOME/build-tools/35.0.0/apksigner.bat" verify --print-certs -v <apk>
"$ANDROID_HOME/build-tools/35.0.0/aapt2.exe" dump badging <apk> | head -1
```

Build 2 verifies under APK Signature Scheme v2, DN `CN=KIDS Kolkata SET`,
certificate SHA-256 `b9b4bc…6c876`, `versionCode=2`, 5.7 MB. **If that SHA-256
ever changes, the key changed** and no existing installation can take the
update.

## Getting it to a student

There is no store, so the APK is a file on the internet that a student
downloads. It goes to **GitHub Releases** on this repo, not to Vercel — Vercel's
bandwidth will not survive thousands of downloads, and GitHub's release assets
are free and unmetered. A release APK carries no secret: the only thing baked
into it is the public server URL.

Per release, in the web UI (there is no `gh` CLI on this machine):

1. **Releases → Draft a new release** on `marsiqsystem/KIDS`.
2. Tag `app-b<APP_BUILD>` — `app-b2` for build 2 — on `main`. Title the same.
3. In the body, the one line from `BUILD_NOTES[APP_BUILD]` — it is what the
   student already read on the update card, so it should match.
4. Attach the APK from `native/dist/`, but **rename it to `kids-set.apk`**
   first. The name in `native/dist/` deliberately carries the build number and
   the server, which is right on a laptop holding several; the uploaded asset
   must have the *same* name every time, because that is what makes the link
   below permanent.
5. Publish.

Then, once ever, in Vercel → Settings → Environment Variables:

```
KIDS_APK_URL = https://github.com/marsiqsystem/KIDS/releases/latest/download/kids-set.apk
```

`/releases/latest/download/` always resolves to the newest published release, so
this value never needs changing again. Without it set, `apkUrl()` in
`src/lib/app/app-version.ts` returns null and the update card tells the student
to ask KIDS — true, but a dead end.

## What this actually buys over the website

Worth being precise about, because the reason for building it was exam
security and that is the one thing it does *least* well.

**Real:**

* Its own icon, opening full-screen — no address bar, no tabs, and nothing to
  share as a link.
* **`FLAG_SECURE`** (`MainActivity.java`) — Android itself refuses screenshots
  and screen recording, and the app does not appear in the recent-apps
  thumbnail. A browser cannot do this. For a question paper, it is the single
  most valuable line in the project.
* Storage that belongs to the app, so the device id from Phase 0 is not thrown
  away by clearing browser history.
* Somewhere for FCM push to arrive later.

**Not real, and nobody should discover this during an exam:** it cannot stop a
student leaving the app. True lockdown is Android's *lock task mode*, and an
ordinary installed app may not enter it — that needs the phone enrolled as a
**device owner** through MDM provisioning, i.e. factory-reset and enrolled
before anything else. Not possible on 9,655 children's own phones. What an
app *can* call is screen pinning, which the student accepts and leaves by
holding back + overview: a speed bump with a visible exit.

Leaving is **detectable**, not preventable — and it is equally detectable in a
browser via `visibilitychange`. And none of it touches a second phone pointed at
the first, which no software on the exam device ever can.

**iPhone gets none of this.** There is no free way to install a native iOS app;
the free route is Add to Home Screen, which is a PWA. One codebase still serves
both — this shell for Android, the same URL for iPhone.

## Known limits of this build

* **It needs a connection.** Every screen comes from the server. There is no
  offline mode and cannot be one until the ten server actions become an HTTP
  API and the screens are exported statically. `native/www/index.html` is the
  no-connection screen, and the only thing in here the server does not serve.
* **A sideloaded APK never auto-updates.** There is no store to do it. The
  version check is built — `src/lib/app/app-version.ts` reads the build number
  out of the user-agent and shows a card to a phone that is behind — but a card
  can only *tell* a student. They still install the new file by hand, so every
  build number costs 65 people a download.
* Android will warn about "unknown sources" on install. Students need telling
  that is expected, which is a short page on the website, also not built yet.

## Files

| path | what |
| --- | --- |
| `capacitor.config.ts` | app id, name, and the server URL (`KIDS_APP_URL`) |
| `native/build-apk.mjs` | the build, with JDK/SDK discovery and the signing check |
| `android/keystore.properties` | where the release key is, and its password (gitignored) |
| `native/www/index.html` | the no-connection screen |
| `android/` | the generated native project; `MainActivity.java` is ours |
| `android/app/src/main/res/mipmap-*/` | launcher icons, from `public/android-chrome-512x512.png` |
