/**
 * Google Drive thumbnail uploads.
 *
 * Design notes:
 * - We do NOT reuse the Firebase login credential's OAuth token: Firebase does
 *   not refresh it and it expires ~1h after sign-in, so uploads would silently
 *   fail whenever you add a listing later in a session. Instead we mint a fresh
 *   Drive access token on demand via Google Identity Services (GIS). After the
 *   first consent it is granted silently.
 * - Scope is `drive.file` (set on the Firebase provider too) — least privilege,
 *   access limited to files this app creates.
 * - Uploaded files are made public (`anyone: reader`). The user accepted that
 *   thumbnails are public. Drive is not a real CDN, so image rendering can be
 *   flaky; `driveThumbUrl` uses the least-unreliable display endpoint.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";

// --- Minimal GIS typings (the script has no bundled types) -----------------
type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
};
type TokenClient = {
  callback: (resp: TokenResponse) => void;
  requestAccessToken: (opts?: { prompt?: string }) => void;
};
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

/** Ensure the GIS client script is present and loaded. */
const loadGis = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services"))
      );
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });

let tokenClient: TokenClient | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

/** Get a Drive access token, reusing a cached one until ~1 min before expiry. */
const getDriveToken = async (): Promise<string> => {
  if (!CLIENT_ID) {
    throw new Error(
      "VITE_GOOGLE_CLIENT_ID is not set — Drive uploads are disabled."
    );
  }
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  await loadGis();
  const gis = window.google!.accounts.oauth2;
  if (!tokenClient) {
    tokenClient = gis.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: () => {}, // replaced per-request below
    });
  }

  return new Promise<string>((resolve, reject) => {
    tokenClient!.callback = (resp) => {
      if (resp.error || !resp.access_token) {
        reject(new Error(resp.error ?? "Failed to get Drive access token"));
        return;
      }
      cachedToken = {
        value: resp.access_token,
        expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000,
      };
      resolve(resp.access_token);
    };
    // "" lets GIS grant silently once consent has been given.
    tokenClient!.requestAccessToken({ prompt: "" });
  });
};

/** True when Drive uploads are configured (client id present). */
export const isDriveConfigured = (): boolean => !!CLIENT_ID;

/**
 * Upload an image to the user's Drive, make it public, and return its file id.
 * Uses a multipart upload (metadata + bytes in one request).
 */
export const uploadImageToDrive = async (file: File): Promise<string> => {
  const token = await getDriveToken();

  const metadata = {
    name: `immo-search/${Date.now()}-${file.name}`,
    mimeType: file.type || "image/jpeg",
  };
  const body = new FormData();
  body.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  body.append("file", file);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body }
  );
  if (!uploadRes.ok) {
    throw new Error(`Drive upload failed (${uploadRes.status})`);
  }
  const { id } = (await uploadRes.json()) as { id: string };

  // Make the file public so its thumbnail can be displayed.
  const permRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  );
  if (!permRes.ok) {
    throw new Error(`Drive permission update failed (${permRes.status})`);
  }

  return id;
};

/** Public display URL for a Drive image (least-flaky endpoint). */
export const driveThumbUrl = (fileId: string, width = 1000): string =>
  `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
