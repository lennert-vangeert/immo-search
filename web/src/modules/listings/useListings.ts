import { useEffect, useState } from "react";
import { subscribeListings, type ListingWithId } from "@services/listings";

/** Live list of all listings (newest first), kept in sync via a Firestore listener. */
export const useListings = () => {
  const [listings, setListings] = useState<ListingWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeListings((next) => {
      setListings(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { listings, loading };
};
