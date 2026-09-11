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

Build 5 verifies under APK Signature Scheme v2, DN `CN=KIDS Kolkata SET`,
certificate SHA-256 `b9b4bc…6c876`, `versionCode=5`, 5.7 MB. **If that SHA-256
ever changes, the key changed** and no existing installation can take the
update.

⚠️ **The build 2 that reached a phone was DEBUG-signed**, made before the key
existed. Android refuses an update across a signature change, so that one phone
had to uninstall before it could take build 3. That was a one-time cost and it
is behind us — every build from 3 onward carries the key above — but it is the
reason "it installs over the top" was wrong once, and it would be wrong again
for anybody still holding a debug build.

## Push notifications

Native, through **Firebase Cloud Messaging** — not a service worker. Android's
System WebView has no Push API, so inside this APK a web-push subscription
cannot exist at all; the full reasoning is at the top of `src/lib/app/push.ts`.
Two things are pushed and only two: a **post** written in the control centre,
and a **class being opened** by its teacher. The other three notice kinds are
states of a student's own record, with no instant at which anything happened.

FCM is free — this is not the paid-billing trap that Firebase phone auth is.

**Everything is inert until it is configured.** With `KIDS_FCM_SERVICE_ACCOUNT`
unset every send returns 0 and writes nothing, and the shell layout tells
`PushRegistrar` not to touch the plugin at all. A post is still written and a
class still opened either way.

⚠️ **The plugin is not even IN the APK until `android/app/google-services.json`
exists.** `capacitor.config.ts` sets `android.includePlugins` from whether that
file is present. This is not tidiness — it is the fix for build 3, which died
on launch with no screen and nothing on the phone to say why. The push plugin
drags `firebase-messaging` in, and Firebase initialises itself from a
ContentProvider at process start: before our code, before the WebView, before
any JavaScript guard could matter. With none of the resources the Gradle plugin
would have written, it took the app down with it.

**The rule that came out of it: never ship a native plugin for a service that
does not exist yet.** Unused native code is not inert — a ContentProvider runs
whether anything calls it or not. Tying the decision to the file rather than to
a flag means it cannot drift: drop `google-services.json` in and the next build
carries push; take it away and it does not.

To turn it on, once:

1. **Firebase console → Add project.** Name it KIDS; Analytics is not needed.
2. **Add an Android app**, package name **`org.kidskolkata.set`** — it must match
   `applicationId` exactly or the token is issued for a different app.
3. Download **`google-services.json`** into **`android/app/`**. It is gitignored
   (this repo is public), so it has to be downloaded again on any other machine.
4. **Project settings → Service accounts → Generate new private key.** That JSON
   is the secret. Put the **whole file, on one line** into `.env.local` and into
   Vercel as **`KIDS_FCM_SERVICE_ACCOUNT`**. One variable rather than three,
   because splitting a multi-line PEM across variables is how one of them ends
   up belonging to a different project.
5. **Bump `APP_BUILD`** in `src/lib/app/app-build.ts`, with a line in
   `BUILD_NOTES`, then `npm run app:apk -- --release`. A new APK is unavoidable:
   the push plugin is native code, and no build made before step 3 even
   contains it, so an older phone can never receive a notification however the
   server is configured.

Then check it end to end, in this order, because each step's failure looks like
the next one's:

* The app asks for notification permission on first launch after installing
  build 3. If it never asks, `google-services.json` is missing from the build.
* `select uid, push_token is not null from app_devices` — a token reached the
  database. If not, look for "Push: Firebase would not issue a token" in the
  WebView console.
* Write a post to batch 7 from /admin and watch the phone. The audit row
  `post_pushed` carries how many phones took it, and the three states tell
  themselves apart: **no row** means push is not configured at all, a row saying
  **0** means it is configured and nobody was reachable, and a number means
  phones took it.

Only the phone an account is **currently bound to** is sent to — the same rule
`requireStudent()` enforces on every page. A student who moves handsets stops
being reachable on the old one at the moment their session does.

## Getting it to a student

There is no store, so the APK is a file on the internet that a student
downloads. It goes to **GitHub Releases** on this repo, not to Vercel — Vercel's
bandwidth will not survive thousands of downloads, and GitHub's release assets
are free and unmetered. A release APK carries no secret: the only thing baked
into it is the public server URL.

Per release, in the web UI (there is no `gh` CLI on this machine):

1. **Releases → Draft a new release** on `marsiqsystem/KIDS`.
2. Tag `app-b<APP_BUILD>` — `app-b5` for build 5 — on `main`. Title the same.
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
| `native/build-icons.mjs` | every launcher icon, Android and web, from one logo |
| `android/keystore.properties` | where the release key is, and its password (gitignored) |
| `native/www/index.html` | the no-connection screen |
| `android/` | the generated native project; `MainActivity.java` is ours |
| `android/app/src/main/res/mipmap-*/` | launcher icons, from `public/android-chrome-512x512.png` |
