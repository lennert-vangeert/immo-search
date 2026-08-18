/**
 * The only Google accounts allowed to use immo-search.
 *
 * This is a UX gate only — it rejects the sign-in popup early and shows a nice
 * message. The REAL enforcement lives in `firestore.rules` (`isAllowed()`),
 * which runs on Google's servers and cannot be bypassed. Keep the two lists in
 * sync: whenever you edit this array, edit the hardcoded emails in
 * `web/firestore.rules` to match, then redeploy the rules.
 */
export const ALLOWED_USER_EMAILS: string[] = [
  "lennert.vangeert@gmail.com",
  "laura.volkaert14@gmail.com",
].map((e) => e.toLowerCase());

/** True if `email` is one of the allowed accounts (case-insensitive). */
export const isEmailAllowed = (email?: string | null): boolean =>
  !!email && ALLOWED_USER_EMAILS.includes(email.toLowerCase());
