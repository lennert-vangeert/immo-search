import {
  addDoc,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { listingsCol, type Listing, type Reaction } from "@data/listings";

/** A listing document plus its Firestore id (what the UI consumes). */
export type ListingWithId = Listing & { id: string };

/**
 * Fields a user supplies on create/edit. `reactions` is excluded — it's managed
 * per-key via `setReaction` so the form can never clobber the other person's vote.
 */
export type ListingInput = Omit<
  Listing,
  "createdBy" | "createdAt" | "updatedAt" | "reactions"
>;

/** Live-subscribe to all listings, newest first. Returns the unsubscribe fn. */
export const subscribeListings = (
  cb: (listings: ListingWithId[]) => void
): Unsubscribe => {
  const q = query(listingsCol(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const createListing = async (
  createdBy: string,
  input: ListingInput
): Promise<string> => {
  const ref = await addDoc(listingsCol(), {
    ...input,
    reactions: {},
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Set (or clear) the current user's reaction. Uses a dot-path update so only
 * this user's key changes — the other person's vote is never overwritten.
 */
export const setReaction = async (
  id: string,
  uid: string,
  reaction: Reaction | null
): Promise<void> => {
  await updateDoc(doc(listingsCol(), id), {
    [`reactions.${uid}`]: reaction === null ? deleteField() : reaction,
    updatedAt: serverTimestamp(),
  });
};

export const updateListing = async (
  id: string,
  input: Partial<ListingInput>
): Promise<void> => {
  await updateDoc(doc(listingsCol(), id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
};

export const deleteListing = async (id: string): Promise<void> => {
  await deleteDoc(doc(listingsCol(), id));
};
