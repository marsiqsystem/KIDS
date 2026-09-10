import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Which addresses may load the dev server's own assets.
   *
   * Next blocks cross-origin requests to dev-only assets by default, and the
   * laptop's LAN address is a different origin from the `localhost` the server
   * was started with. Testing on a real phone means reaching the dev server by
   * that address, so it has to be listed here.
   *
   * ⚠️ **This is the laptop's Wi-Fi address and it changes with the network.**
   * When it does, every `/_next/*` chunk is refused, React never hydrates, and
   * the page still renders — server-side — so nothing looks broken. On a class
   * page that is a black box with no error, which reads exactly like a video
   * server fault and is not one. It cost an evening on 11 Sep 2026, chasing
   * certificates and a server, before the box was asked to say what it was
   * doing and answered "starting" — i.e. no JavaScript had ever run.
   *
   * Find the current address with `ipconfig`, put it here, restart `npm run
   * dev`. Production is unaffected: this option applies only in development.
   */
  allowedDevOrigins: ["192.168.117.175", "192.168.0.135"],
};

export default nextConfig;
