import { FirebaseError } from "firebase/app";
import { NOT_ALLOWED_ERROR } from "@global/firebase/auth";

/**
 * Map an auth error to a translation key in the `auth` namespace
 * (e.g. "errors.notAllowed"). The caller translates it via t().
 */
export function authErrorKey(err: unknown): string {
  if (err instanceof Error && err.message === NOT_ALLOWED_ERROR) {
    return "errors.notAllowed";
  }
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "errors.popupClosed";
      case "auth/popup-blocked":
        return "errors.popupBlocked";
    }
  }
  return "errors.generic";
}
