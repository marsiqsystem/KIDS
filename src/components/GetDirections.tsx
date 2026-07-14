"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, MapPin, Navigation } from "lucide-react";
import type { Centre } from "@/lib/centres";
import { directionsUrl, mapUrl, type Coords } from "@/lib/maps";

/**
 * "Get Google Directions", done without stranding anyone on a blank page.
 *
 * The first click asks for location, waits for the answer HERE under a spinner
 * the user can see, and only then navigates. The original version opened a blank
 * tab FIRST and held it through a 10s high-accuracy GPS call, which on a phone
 * is several seconds of staring at nothing. Because the navigation now happens
 * after an await it must be same-tab: window.open() post-await is eaten by popup
 * blockers.
 *
 * Once permission exists we read the position up front (permissions.query
 * prompts nobody), the anchor becomes a plain link again, and there is no
 * interception and no wait.
 */
export default function GetDirections({ centre }: { centre: Centre }) {
  const [from, setFrom] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => setFrom({ lat: coords.latitude, lng: coords.longitude }),
          () => {},
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
        );
      })
      .catch(() => {});
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (from) return; // already located — let the href open a new tab
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;

    event.preventDefault();
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lat: coords.latitude, lng: coords.longitude };
        setFrom(here);
        setLocating(false);
        window.location.href = directionsUrl(centre, here);
      },
      () => {
        // Declined or timed out. Still take them there; Google will estimate the
        // start rather than leaving them stuck on this page.
        setLocating(false);
        window.location.href = directionsUrl(centre, null);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <a
          href={directionsUrl(centre, from)}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
          aria-busy={locating}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-on-secondary transition-all hover:brightness-110 aria-busy:cursor-wait aria-busy:opacity-70"
        >
          {locating ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Getting your location&hellip;
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4" aria-hidden="true" />
              Get Google Directions
            </>
          )}
        </a>

        <a
          href={mapUrl(centre)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 transition-colors hover:text-secondary"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          View centre on the map
        </a>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
        {from
          ? "Directions will start from your current location."
          : "We'll ask for your location so the route starts from exactly where you are. If you decline, Google Maps will estimate your starting point instead."}
      </p>
    </>
  );
}
