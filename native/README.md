# The Android app

A Capacitor shell around the student app that already exists in `src/app/app`.
It loads those 40 screens from the server into its own WebView, so there is no
second copy of the daily loop, the question bank or the record screens to keep
in step with the first.

## Build one

```bash
npm run app:apk -- --url=http://192.168.0.135:3000   # this laptop, for testing
npm run app:apk -- --url=https://<branch>.vercel.app # the student-app preview
npm run app:apk                                      # production
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

On another laptop, both of those have to exist there too, and
`~/.gradle/gradle.properties` needs its `org.gradle.java.home` line corrected.

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
* **It is a debug build.** Debug-signed, fine for sideloading and testing,
  wrong for handing to students. A release build needs a keystore — which is
  the app's identity: lose it and no student can install an update over what
  they have; leak it and anyone can sign an APK claiming to be this one. It is
  gitignored in two places and must be backed up somewhere that is not this
  repo.
* **A sideloaded APK never auto-updates.** There is no store to do it. A
  version check on launch plus an "Update available" link is not optional —
  without it, students sit on old versions forever with no way to reach them.
  Not built yet.
* Android will warn about "unknown sources" on install. Students need telling
  that is expected, which is a short page on the website, also not built yet.

## Files

| path | what |
| --- | --- |
| `capacitor.config.ts` | app id, name, and the server URL (`KIDS_APP_URL`) |
| `native/build-apk.mjs` | the build, with JDK/SDK discovery |
| `native/www/index.html` | the no-connection screen |
| `android/` | the generated native project; `MainActivity.java` is ours |
| `android/app/src/main/res/mipmap-*/` | launcher icons, from `public/android-chrome-512x512.png` |
