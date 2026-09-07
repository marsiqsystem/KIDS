package org.kidskolkata.set;

import android.os.Bundle;
import android.view.WindowManager;

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
    }
}
