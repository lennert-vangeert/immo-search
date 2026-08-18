import { useEffect, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  FileButton,
  Group,
  Image,
  Loader,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBrandGoogleDrive,
  IconFolder,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useAuth } from "@global/firebase/useAuth";
import { useTranslate } from "@global/localization";
import { ALLOWED_USER_EMAILS } from "@global/allowedUsers";
import {
  clearDriveConsent,
  connectDrive,
  driveThumbUrl,
  findOrCreateSharedFolder,
  hasDriveConsent,
  isDriveConfigured,
  isDriveConnected,
  isPickerConfigured,
  markDriveConsent,
  pickDriveFolder,
  uploadImageToDrive,
} from "@services/drive";
import {
  setDriveFolder,
  subscribeDriveConfig,
  type DriveConfig,
} from "@services/driveConfig";

const authKey = (uid: string, folderId: string) =>
  `immo-drive-auth:${uid}:${folderId}`;

/**
 * Thumbnail picker backed by Google Drive + a shared folder.
 *
 * Steps (shown one at a time): connect Drive → set up / authorize the shared
 * folder → upload. Only the account that first sets it up auto-creates & shares
 * the folder; the other account authorizes it once via the Google Picker.
 */
export default function ThumbnailField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (fileId: string | null) => void;
}) {
  const { t } = useTranslate("listings");
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [connected, setConnected] = useState(isDriveConnected());
  const [config, setConfig] = useState<DriveConfig | null | undefined>(
    undefined
  );
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState<"connect" | "folder" | "upload" | null>(null);

  useEffect(() => subscribeDriveConfig(setConfig), []);

  // Reconnect silently if this account has consented before — no button needed.
  useEffect(() => {
    if (!isDriveConfigured() || connected || !uid) return;
    if (!hasDriveConsent(uid)) return;
    let cancelled = false;
    connectDrive()
      .then(() => !cancelled && setConnected(true))
      .catch(() => clearDriveConsent(uid));
    return () => {
      cancelled = true;
    };
  }, [uid, connected]);

  useEffect(() => {
    if (config) {
      const ok =
        config.updatedBy === uid ||
        !!localStorage.getItem(authKey(uid, config.folderId));
      setAuthorized(ok);
    } else {
      setAuthorized(false);
    }
  }, [config, uid]);

  const fail = () =>
    notifications.show({ color: "red", message: t("form.uploadError") });

  const handleConnect = async () => {
    setBusy("connect");
    try {
      await connectDrive();
      markDriveConsent(uid);
      setConnected(true);
    } catch {
      fail();
    } finally {
      setBusy(null);
    }
  };

  const handleSetupFolder = async () => {
    setBusy("folder");
    try {
      const others = ALLOWED_USER_EMAILS.filter(
        (e) => e !== user?.email?.toLowerCase()
      );
      const folder = await findOrCreateSharedFolder(others);
      await setDriveFolder(uid, folder);
      localStorage.setItem(authKey(uid, folder.id), "1");
      setAuthorized(true);
    } catch {
      fail();
    } finally {
      setBusy(null);
    }
  };

  const handleAuthorizeFolder = async () => {
    setBusy("folder");
    try {
      const picked = await pickDriveFolder();
      if (!picked) return;
      await setDriveFolder(uid, picked);
      localStorage.setItem(authKey(uid, picked.id), "1");
      setAuthorized(true);
    } catch {
      fail();
    } finally {
      setBusy(null);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !config) return;
    setBusy("upload");
    try {
      const fileId = await uploadImageToDrive(file, config.folderId);
      onChange(fileId);
      notifications.show({ color: "green", message: t("form.uploadDone") });
    } catch {
      fail();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box>
      <Text size="sm" fw={500} mb={4}>
        {t("form.thumbnail")}
      </Text>
      {renderBody()}
    </Box>
  );

  function renderBody() {
    if (!isDriveConfigured()) {
      return (
        <Text size="xs" c="dimmed">
          {t("form.thumbnailDisabled")}
        </Text>
      );
    }

    // Existing thumbnail → preview + remove.
    if (value) {
      return (
        <Group>
          <Image
            src={driveThumbUrl(value, 200)}
            w={96}
            h={72}
            radius="md"
            fit="cover"
            alt=""
            fallbackSrc="https://placehold.co/200x150?text=Drive"
          />
          <ActionIcon
            variant="light"
            color="red"
            aria-label={t("form.thumbnailRemove")}
            onClick={() => onChange(null)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      );
    }

    if (!connected) {
      return (
        <Button
          variant="default"
          loading={busy === "connect"}
          leftSection={<IconBrandGoogleDrive size={16} />}
          onClick={handleConnect}
        >
          {t("form.thumbnailConnect")}
        </Button>
      );
    }

    if (config === undefined) {
      return <Loader size="sm" />;
    }

    // No shared folder yet → this account creates & shares it.
    if (!config) {
      return (
        <Button
          variant="default"
          loading={busy === "folder"}
          leftSection={<IconFolder size={16} />}
          onClick={handleSetupFolder}
        >
          {t("form.folderSetup")}
        </Button>
      );
    }

    // Folder exists but this account hasn't authorized it → Picker.
    if (!authorized) {
      if (!isPickerConfigured()) {
        return (
          <Text size="xs" c="dimmed">
            {t("form.pickerDisabled")}
          </Text>
        );
      }
      return (
        <Group gap="xs">
          <Button
            variant="default"
            loading={busy === "folder"}
            leftSection={<IconFolder size={16} />}
            onClick={handleAuthorizeFolder}
          >
            {t("form.folderAuthorize", { name: config.folderName })}
          </Button>
        </Group>
      );
    }

    // Ready to upload.
    return (
      <Group gap="xs">
        <FileButton onChange={handleUpload} accept="image/*">
          {(props) => (
            <Button
              {...props}
              variant="light"
              loading={busy === "upload"}
              leftSection={<IconUpload size={16} />}
            >
              {t("form.thumbnailUpload")}
            </Button>
          )}
        </FileButton>
        <Text size="xs" c="dimmed">
          {t("form.folderInUse", { name: config.folderName })}
        </Text>
      </Group>
    );
  }
}
