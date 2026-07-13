import type { Centre } from "@/app/set/centres";

const MAPS_DIR = "https://www.google.com/maps/dir/?api=1";
const MAPS_SEARCH = "https://www.google.com/maps/search/?api=1";

export type Coords = { lat: number; lng: number };

/**
 * The text we hand Google as the destination: the exact search string KIDS
 * verified for this centre, not one we assemble.
 *
 * The fallback matters. `encodeURIComponent(undefined)` yields the string
 * "undefined", and Google will cheerfully geocode that to a real address on the
 * other side of the world -- it once sent us to Ontario. Never let a
 * possibly-missing value reach a Maps URL.
 */
export const destination = (centre: Centre): string =>
  centre.mapsQuery?.trim() || `${centre.name}, ${centre.address}`;

/**
 * Directions to a centre, starting from `from` when we have it.
 *
 * With no origin Google still routes -- it just guesses the start from the
 * user's IP, which is only accurate to a neighbourhood.
 */
export const directionsUrl = (centre: Centre, from: Coords | null = null): string =>
  MAPS_DIR +
  (from ? `&origin=${from.lat},${from.lng}` : "") +
  `&destination=${encodeURIComponent(destination(centre))}`;

/** The centre pinned on a map, no route. */
export const mapUrl = (centre: Centre): string =>
  `${MAPS_SEARCH}&query=${encodeURIComponent(destination(centre))}`;
