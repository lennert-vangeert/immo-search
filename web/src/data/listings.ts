import {
  collection,
  Timestamp,
  type CollectionReference,
} from "firebase/firestore";
import { db } from "@global/firebase/config";
import { converter } from "./_shared";

/** Rent or buy — changes the meaning of `price`. */
export type TransactionType = "rent" | "buy";

/** Belgian EPC letter label (Flanders scale, A+ best → F worst). */
export type EpcLabel = "A+" | "A" | "B" | "C" | "D" | "E" | "F";

/** Shared triage stage for a listing. */
export type ListingStatus = "new" | "contacted" | "visited" | "rejected";

export const TRANSACTION_TYPES: TransactionType[] = ["rent", "buy"];
export const EPC_LABELS: EpcLabel[] = ["A+", "A", "B", "C", "D", "E", "F"];
export const LISTING_STATUSES: ListingStatus[] = [
  "new",
  "contacted",
  "visited",
  "rejected",
];

/**
 * Portable scalar fields of a listing.
 *
 * Carries no SDK-specific types (no Timestamp), so the Admin-SDK seed can
 * `import type { ListingData }` and reuse the exact shape without pulling in the
 * browser Firestore SDK. The seed stamps its own Timestamps at write time.
 *
 * Only `url`, `transactionType` and `price` are required by the UI/rules; the
 * rest are optional and default to "" / null / their default enum value.
 */
export type ListingData = {
  url: string; // required — the immo listing link
  transactionType: TransactionType; // required
  price: number; // required (monthly for rent, total for buy)
  title: string; // "" when empty
  municipality: string; // "" when empty
  bedrooms: number | null;
  surfaceM2: number | null;
  epc: EpcLabel | null;
  notes: string; // "" when empty
  thumbnailFileId: string | null; // Google Drive file id (public), or null
  status: ListingStatus; // shared triage stage, default "new"
  isFavorite: boolean; // shared favorite flag, default false
  createdBy: string; // uid of the creator — display-only, NOT access control
};

/** The full Firestore document: portable data + SDK-stamped fields. */
export type Listing = ListingData & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const listingConverter = converter<Listing>();

export const listingsCol = (): CollectionReference<Listing> =>
  collection(db, "listings").withConverter(listingConverter);
