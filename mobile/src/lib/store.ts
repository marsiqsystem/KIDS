import Storage from "expo-sqlite/kv-store";

/**
 * The phone's own keep for an exam in progress: the paper, the answers, which
 * question was on screen, and away periods not yet sent. The website keeps the
 * same things in localStorage; here it is SQLite, synchronous like
 * localStorage, so an answer is on the phone before the tap's render ends.
 *
 * Every read and write swallows its error. A full or broken store must never
 * stop a child answering; the answers still live in memory and go to the
 * server on the next sync.
 */
export function readJson<T>(key: string): T | null {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
  } catch {
    // See above: memory still holds it.
  }
}

export function forget(key: string): void {
  try {
    Storage.removeItemSync(key);
  } catch {
    // Nothing to clean up.
  }
}
