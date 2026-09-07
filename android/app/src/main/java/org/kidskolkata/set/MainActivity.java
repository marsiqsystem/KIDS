package org.kidskolkata.set;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * The app's one and only screen — everything inside it is the web app.
 *
 * The single piece of native code here is FLAG_SECURE, and it is the one thing
 * in this whole project a browser genuinely cannot do. With it set, Android
 * itself refuses screenshots and screen recording: the shortcut does nothing, a
 * recording captures a black rectangle, and the app's window does not appear in
 * the recent-apps thumbnail either.
 *
 * That last part matters more than it sounds. A question paper photographed off
 * a screen and sent round a WhatsApp group is the failure mode this programme
 * has actually suffered, and it is the reason a paper leaks before the exam is
 * over.
 *
 * Its honest limit, so nobody mistakes what it protects: it stops the phone
 * capturing its own screen. It does nothing about a second phone pointed at the
 * first. No software on this device can address that — a hall and an
 * invigilator can, which is what the offline half of SET already does.
 *
 * Set for the whole app rather than only the exam screen, deliberately: the
 * record screens show a child's own marks and the daily loop shows bank
 * questions, and neither is improved by being screenshotted. There is nothing
 * in this app a student needs to capture, and turning the flag on and off
 * around one route is a race waiting to be lost at exactly the wrong moment.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Before super.onCreate, so the flag is in place before the window is
        // ever drawn — set afterwards, the first frame can still be captured.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
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
