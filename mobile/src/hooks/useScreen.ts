import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "@/lib/session";

/**
 * One screen's data from the API, fetched each time the screen comes into
 * view — so Home is current after a set is played, and Notices after one is
 * read — and on demand for pull-to-refresh.
 *
 * Keeps the last good data on screen when a refresh fails: a child on patchy
 * data should see yesterday's numbers with a quiet note, not an empty page.
 */
export function useScreen<T>(path: string) {
  const { call } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await call<T>(path));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [call, path]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { data, failed, refreshing, refresh, reload: load };
}
