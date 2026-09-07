package org.kidskolkata.set;

import android.view.WindowManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Turn Android's screenshot block on and off from the web app.
 *
 * FLAG_SECURE makes the operating system refuse screenshots and screen
 * recording, and keeps the window out of the recent-apps thumbnail. It was
 * first set for the whole app, on the reasoning that nothing in here needs
 * capturing. That was wrong in practice: a student who wants to keep their
 * marksheet, send a section to a tutor, or show a parent a rank gets a black
 * rectangle and no explanation. The result page is the child's own record and
 * they should be able to photograph it.
 *
 * So the block belongs to the exam and nothing else. A question paper leaking
 * out of a live exam is the actual harm; a marksheet is not.
 *
 * Called from src/components/app/ScreenGuard.tsx, which mounts on the screens
 * that are running a paper and clears the flag when it unmounts. The flag lives
 * on the Activity window, so it cannot be left on by a page that navigates
 * away — React's cleanup runs, and if the app is killed outright the window
 * goes with it.
 */
@CapacitorPlugin(name = "ScreenGuard")
public class ScreenGuardPlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        final boolean secure = Boolean.TRUE.equals(call.getBoolean("secure", false));

        // Window flags are UI state and must be touched on the UI thread; a
        // plugin method arrives on a background one.
        getActivity().runOnUiThread(() -> {
            if (secure) {
                getActivity().getWindow().setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                );
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
        });

        call.resolve();
    }
}
