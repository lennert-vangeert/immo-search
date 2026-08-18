import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { upsertProfile } from "@services/users";
import { isEmailAllowed } from "@global/allowedUsers";
import { auth } from "./config";

/** Thrown when a Google account outside the allow-list tries to sign in. */
export const NOT_ALLOWED_ERROR = "auth/not-allowed";

const googleProvider = new GoogleAuthProvider();
// Drive scope lets the app upload listing thumbnails to the user's own Drive.
// `drive.file` is least-privilege: access is limited to files the app creates.
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");

/**
 * Single source of truth for mirroring the Auth user into `users/{uid}`.
 * Called after every sign-in so the profile doc stays in sync.
 */
export const syncUserProfile = async (user: User): Promise<void> => {
  await upsertProfile(user.uid, {
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "Anonymous",
    email: user.email ?? "",
    photoURL: user.photoURL ?? null,
  });
};

export const signInWithGoogle = async (): Promise<User> => {
  const { user } = await signInWithPopup(auth, googleProvider);

  // Allow-list gate: sign a non-allowed account straight back out. The real
  // enforcement is in firestore.rules; this is for a friendly UX.
  if (!isEmailAllowed(user.email)) {
    await fbSignOut(auth);
    throw new Error(NOT_ALLOWED_ERROR);
  }

  await syncUserProfile(user);
  return user;
};

export const signOut = (): Promise<void> => fbSignOut(auth);
