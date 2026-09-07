package org.kidskolkata.set;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * The app's one and only screen — everything inside it is the web app.
 *
 * Two pieces of native behaviour live here: the Back button, and the
 * screenshot block registered as the ScreenGuard plugin.
 *
 * FLAG_SECURE is NOT set here any more. It was, for the whole app, on the
 * reasoning that nothing in here needs capturing. In use that was plainly
 * wrong: a student photographing their own marksheet to send to a parent got a
 * black rectangle and no explanation. A result belongs to the child.
 *
 * The block now belongs to the exam alone, switched on by the screen that is
 * running a paper — see ScreenGuardPlugin and ScreenGuard.tsx. A question paper
 * leaking out of a live exam is the real harm, and it is the one this
 * programme has actually suffered.
 *
 * Its honest limit, unchanged: it stops the phone capturing its own screen. It
 * does nothing about a second phone pointed at the first. No software on this
 * device can address that — a hall and an invigilator can, which is what the
 * offline half of SET already does.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Before super.onCreate: the bridge reads the registry as it starts, so
        // a plugin registered afterwards is not there when the first page loads.
        registerPlugin(ScreenGuardPlugin.class);

        super.onCreate(savedInstanceState);

        registerBackHandler();
    }

    /**
     * Make the phone's Back button go back a page instead of shutting the app.
     *
     * Capacitor ships no back handling of its own, so the activity got
     * Android's default — finish() — and Back closed the app from any screen.
     * On a five-tab app where a student taps into a chapter, a question and an
     * explanation, that is the difference between an app and a leaflet.
     *
     * Registered on the OnBackPressedDispatcher rather than by overriding
     * onBackPressed(), which is deprecated and, for an app targeting SDK 36,
     * is no longer called at all: Android 16 turns predictive back on by
     * default. The dispatcher is the one route that works under both.
     *
     * The WebView's own history is the right thing to walk. Next's client-side
     * navigation pushes real history entries, so goBack() lands on the previous
     * screen and the router picks it up. When there is nothing left to go back
     * to — the sign-in screen, or the home tab — the callback stands down and
     * hands the press back to the system, which closes the app as it should.
     */
    private void registerBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() == null ? null : getBridge().getWebView();

                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                // Nothing to go back to: disable this callback and re-dispatch,
                // so the system default runs. Calling finish() directly would
                // skip whatever else is listening.
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        });
    }
}
