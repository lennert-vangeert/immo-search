import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@global/firebase/config";

/** The single shared Drive folder used for listing thumbnails. */
export type DriveConfig = {
  folderId: string;
  folderName: string;
  updatedBy: string;
  updatedAt: Timestamp;
};

const driveConfigDoc = () => doc(db, "config", "drive");

/** Live-subscribe to the shared-folder config (null until one is set). */
export const subscribeDriveConfig = (
  cb: (config: DriveConfig | null) => void
): Unsubscribe =>
  onSnapshot(driveConfigDoc(), (snap) => {
    cb(snap.exists() ? (snap.data() as DriveConfig) : null);
  });

/** Set (or replace) the shared folder both accounts upload into. */
export const setDriveFolder = async (
  uid: string,
  folder: { id: string; name: string }
): Promise<void> => {
  await setDoc(driveConfigDoc(), {
    folderId: folder.id,
    folderName: folder.name,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
};
