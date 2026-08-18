# immo-search

A private, 2-account web app to save and compare real-estate listings (rent or
buy). React 19 + Vite + Mantine 8 + Firebase (Google-only auth + Firestore).
Dutch (default) and English.

## Quick start

```sh
npm install
npm run dev   # boots the emulators, seeds fresh listings, starts Vite on :4000
```

Login is **Google-only**. Against the emulator, use the mock Google account
picker and enter one of the allowed emails (see below).

## Configuration

### Allow-list (who can log in) — keep two places in sync

Only the listed Google accounts may use the app. The emails live in **two**
places and MUST match:

1. `src/global/allowedUsers.ts` — `ALLOWED_USER_EMAILS` (client-side UX gate).
2. `firestore.rules` — the `isAllowed()` function (the real, server-side gate).

After editing, redeploy the rules: `npx firebase deploy --only firestore:rules`.

### Environment variables (`web/.env`)

- `VITE_APP_ENV` — `dev` (emulators) or `prd` (real project). `scripts/dev.sh`
  sets `dev` automatically.
- `VITE_FIREBASE_*` — the real Firebase web config (prod only).
- `VITE_GOOGLE_CLIENT_ID` — OAuth **web client id** used to mint Google Drive
  upload tokens for listing thumbnails. Reuse the client id Firebase Auth
  already created for this project, and enable the **Google Drive API** in that
  Google Cloud project. When unset, thumbnail upload is disabled gracefully
  (the rest of the app works).

### One-time prod setup

1. Create a Firebase project; enable the **Google** sign-in provider; fill in
   `VITE_FIREBASE_*`.
2. Enable the **Google Drive API** in the linked Google Cloud project; put the
   OAuth web client id in `VITE_GOOGLE_CLIENT_ID`; add your app origin to the
   client's authorized JavaScript origins.
3. Set the two allowed emails in `allowedUsers.ts` and `firestore.rules`, then
   `npx firebase deploy --only firestore:rules`.

## Notes

- **Thumbnails** upload to the uploader's own Google Drive (`drive.file` scope)
  and are made public. Drive is not a real CDN, so a thumbnail can occasionally
  fail to render — the listing still works via its "Open listing" link.
- **Adding a Firestore collection or fields** → see
  [`docs/adding-a-collection.md`](docs/adding-a-collection.md).
