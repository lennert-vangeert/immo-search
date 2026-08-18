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
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHARED_FOLDER_NAME = "immo-search";

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
    // Picker + gapi are loosely typed (no bundled types for these scripts).
    gapi?: {
      load: (
        name: string,
        cfg: { callback: () => void; onerror?: () => void }
      ) => void;
    };
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      picker?: any;
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

/** True when we hold a still-valid Drive token (no popup needed to upload). */
export const isDriveConnected = (): boolean =>
  !!cachedToken && Date.now() < cachedToken.expiresAt - 60_000;

/**
 * Request Drive access. MUST be called directly from a click handler — the
 * consent popup can only open in response to a user gesture, so we do this on
 * its own button rather than after the file picker (which would be blocked).
 */
export const connectDrive = async (): Promise<void> => {
  await getDriveToken();
};

/**
 * Upload an image to Drive, make it public, and return its file id. Uses a
 * multipart upload (metadata + bytes in one request). When `folderId` is given,
 * the file is placed in that (shared) folder.
 */
export const uploadImageToDrive = async (
  file: File,
  folderId?: string
): Promise<string> => {
  const token = await getDriveToken();

  const metadata: Record<string, unknown> = {
    name: `${Date.now()}-${file.name}`,
    mimeType: file.type || "image/jpeg",
    ...(folderId ? { parents: [folderId] } : {}),
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

/** Best-effort delete of a Drive file (e.g. a listing's thumbnail). 404 = already gone. */
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = await getDriveToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Drive delete failed (${res.status})`);
  }
};

// --- Consent flag (per account, per browser) -------------------------------
// Lets us reconnect silently and know when a Drive call can be made without a
// popup (used to decide whether to delete a thumbnail on listing delete).
const consentKey = (uid: string) => `immo-drive-consented:${uid}`;
export const hasDriveConsent = (uid: string): boolean =>
  !!uid && !!localStorage.getItem(consentKey(uid));
export const markDriveConsent = (uid: string): void => {
  if (uid) localStorage.setItem(consentKey(uid), "1");
};
export const clearDriveConsent = (uid: string): void => {
  if (uid) localStorage.removeItem(consentKey(uid));
};

// --- Shared folder + Google Picker -----------------------------------------

/** True when the folder Picker is usable (needs both a client id and API key). */
export const isPickerConfigured = (): boolean => !!CLIENT_ID && !!API_KEY;

export type DriveFolder = { id: string; name: string };

/**
 * Find (among app-created folders) or create the shared "immo-search" folder in
 * the current user's Drive, then share it with the other allowed accounts as
 * editors. Only the creator needs this; the other account authorizes via the
 * Picker. Returns the folder.
 */
export const findOrCreateSharedFolder = async (
  shareWithEmails: string[]
): Promise<DriveFolder> => {
  const token = await getDriveToken();
  const auth = { Authorization: `Bearer ${token}` };

  // drive.file only surfaces app-created files, so this finds our own folder.
  const q = encodeURIComponent(
    `name='${SHARED_FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`
  );
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
    { headers: auth }
  );
  if (listRes.ok) {
    const { files } = (await listRes.json()) as { files?: DriveFolder[] };
    if (files && files.length > 0) return files[0];
  }

  // Create it.
  const createRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: SHARED_FOLDER_NAME, mimeType: FOLDER_MIME }),
    }
  );
  if (!createRes.ok) {
    throw new Error(`Drive folder create failed (${createRes.status})`);
  }
  const folder = (await createRes.json()) as DriveFolder;

  // Share with the other account(s). Ignore individual failures (e.g. already shared).
  await Promise.all(
    shareWithEmails.map((email) =>
      fetch(
        `https://www.googleapis.com/drive/v3/files/${folder.id}/permissions?sendNotificationEmail=false`,
        {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ role: "writer", type: "user", emailAddress: email }),
        }
      ).catch(() => undefined)
    )
  );

  return folder;
};

/** Ensure gapi + the Picker module are loaded. */
const loadPicker = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const loadModule = () => {
      window.gapi!.load("picker", {
        callback: () => resolve(),
        onerror: () => reject(new Error("Failed to load Google Picker")),
      });
    };
    if (window.google?.picker) return resolve();
    if (window.gapi) return loadModule();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GAPI_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", loadModule);
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load gapi"))
      );
      return;
    }
    const s = document.createElement("script");
    s.src = GAPI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = loadModule;
    s.onerror = () => reject(new Error("Failed to load gapi"));
    document.head.appendChild(s);
  });

/**
 * Open the Google Picker so the user can select a folder (including
 * shared-with-me). Resolves with the chosen folder, or null if cancelled.
 * Picking a folder grants this app drive.file access to it.
 */
export const pickDriveFolder = async (): Promise<DriveFolder | null> => {
  if (!API_KEY) throw new Error("VITE_GOOGLE_API_KEY is not set.");
  const token = await getDriveToken();
  await loadPicker();
  const picker = window.google!.picker;

  return new Promise<DriveFolder | null>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.FOLDERS)
      .setSelectFolderEnabled(true)
      .setIncludeFolders(true)
      .setMimeTypes(FOLDER_MIME);

    const instance = new picker.PickerBuilder()
      .addView(view)
      .enableFeature(picker.Feature.SUPPORT_DRIVES)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setCallback((data: { action: string; docs?: { id: string; name: string }[] }) => {
        if (data.action === picker.Action.PICKED) {
          const doc = data.docs?.[0];
          resolve(doc ? { id: doc.id, name: doc.name } : null);
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    instance.setVisible(true);
  });
};
