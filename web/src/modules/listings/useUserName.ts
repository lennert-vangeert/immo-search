import { useEffect, useState } from "react";
import { getProfile } from "@services/users";

// Module-level cache so a uid is only fetched once per session.
const cache = new Map<string, string>();

/** Resolve a uid to a display name (cached). Empty string until known. */
export const useUserName = (uid: string | undefined | null): string => {
  const [name, setName] = useState(() => (uid && cache.get(uid)) || "");

  useEffect(() => {
    if (!uid) return;
    const cached = cache.get(uid);
    if (cached) {
      setName(cached);
      return;
    }
    let active = true;
    getProfile(uid)
      .then((p) => {
        const n = p?.displayName || p?.email?.split("@")[0] || "";
        if (n) cache.set(uid, n);
        if (active) setName(n);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [uid]);

  return name;
};
