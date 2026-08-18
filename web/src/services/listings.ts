import {
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { listingsCol, type Listing } from "@data/listings";

/** A listing document plus its Firestore id (what the UI consumes). */
export type ListingWithId = Listing & { id: string };

/** Fields a user supplies on create/edit — server/auth manage the rest. */
export type ListingInput = Omit<
  Listing,
  "createdBy" | "createdAt" | "updatedAt"
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
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
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
