import { EPC_LABELS, type EpcLabel, type ListingStatus } from "@data/listings";
import type { ListingWithId } from "@services/listings";

export type SortKey =
  | "newest"
  | "price"
  | "pricePerM2"
  | "surface"
  | "bedrooms"
  | "epc";
export type SortDir = "asc" | "desc";

/** Price per m² (buy: total/m², rent: monthly/m²), or null without a surface. */
export const pricePerM2 = (l: ListingWithId): number | null =>
  l.surfaceM2 && l.surfaceM2 > 0 ? l.price / l.surfaceM2 : null;

export type ListingFilters = {
  transactionType: "all" | "rent" | "buy";
  status: "all" | ListingStatus;
  favoritesOnly: boolean;
};

export const DEFAULT_FILTERS: ListingFilters = {
  transactionType: "all",
  status: "all",
  favoritesOnly: false,
};

/** Apply filters, then sort. `newest` relies on the query's createdAt order. */
export const filterAndSortListings = (
  listings: ListingWithId[],
  filters: ListingFilters,
  sortKey: SortKey,
  sortDir: SortDir
): ListingWithId[] => {
  const filtered = listings.filter((l) => {
    if (
      filters.transactionType !== "all" &&
      l.transactionType !== filters.transactionType
    )
      return false;
    if (filters.status !== "all" && l.status !== filters.status) return false;
    if (filters.favoritesOnly && !l.isFavorite) return false;
    return true;
  });

  if (sortKey === "newest") {
    // Already newest-first from Firestore; reverse for ascending.
    return sortDir === "desc" ? filtered : [...filtered].reverse();
  }

  const value = (l: ListingWithId): number | null => {
    switch (sortKey) {
      case "price":
        return l.price;
      case "pricePerM2":
        return pricePerM2(l);
      case "surface":
        return l.surfaceM2;
      case "bedrooms":
        return l.bedrooms;
      case "epc":
        // Lower index = better EPC (A+ = 0). Nulls sort last.
        return l.epc ? EPC_LABELS.indexOf(l.epc) : null;
    }
  };

  const mul = sortDir === "asc" ? 1 : -1;
  return [...filtered].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls always last
    if (bv == null) return -1;
    return (av - bv) * mul;
  });
};

/** Best human label for a listing: title → municipality → URL host → fallback. */
export const listingLabel = (l: ListingWithId, fallback: string): string => {
  if (l.title.trim()) return l.title.trim();
  if (l.municipality.trim()) return l.municipality.trim();
  const host = hostnameOf(l.url);
  return host || fallback;
};

/** The bare hostname of a URL (no www.), or "" if it can't be parsed. */
export const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** True only for a real absolute http(s) URL (guards against embedding our own app). */
export const isValidHttpUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/** Format a price with EUR grouping; rent gets a "/mo" style suffix via i18n. */
export const formatPrice = (price: number): string =>
  `€${price.toLocaleString("nl-BE")}`;

/** Format a €/m² value (rounded), or "—" when null. */
export const formatPricePerM2 = (v: number | null): string =>
  v == null ? "—" : `€${Math.round(v).toLocaleString("nl-BE")}/m²`;

/** Mantine color for an EPC letter — green (best) → red (worst). */
export const epcColor = (epc: EpcLabel | null): string => {
  switch (epc) {
    case "A+":
    case "A":
      return "green";
    case "B":
      return "teal";
    case "C":
      return "lime";
    case "D":
      return "yellow";
    case "E":
      return "orange";
    case "F":
      return "red";
    default:
      return "gray";
  }
};

/** Mantine color for a status pill. */
export const statusColor = (status: ListingStatus): string => {
  switch (status) {
    case "new":
      return "blue";
    case "contacted":
      return "grape";
    case "visited":
      return "teal";
    case "rejected":
      return "gray";
    default:
      return "gray";
  }
};
