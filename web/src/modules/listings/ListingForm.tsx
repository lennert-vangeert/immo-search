import { useState } from "react";
import {
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconWand } from "@tabler/icons-react";
import {
  EPC_LABELS,
  LISTING_STATUSES,
  TRANSACTION_TYPES,
  type EpcLabel,
  type ListingStatus,
  type TransactionType,
} from "@data/listings";
import type { ListingInput, ListingWithId } from "@services/listings";
import { fetchListingPreview } from "@services/preview";
import { useTranslate } from "@global/localization";
import ThumbnailField from "./ThumbnailField";
import { isValidHttpUrl } from "./listingUi";

// Flat form state. Numbers use "" for "not set" (NumberInput's empty value).
type ListingFormValues = {
  url: string;
  transactionType: TransactionType;
  price: number | "";
  title: string;
  municipality: string;
  bedrooms: number | "";
  surfaceM2: number | "";
  epc: EpcLabel | "";
  notes: string;
  status: ListingStatus;
  isFavorite: boolean;
  thumbnailFileId: string | null;
};

const toFormValues = (listing?: ListingWithId): ListingFormValues => ({
  url: listing?.url ?? "",
  transactionType: listing?.transactionType ?? "buy",
  price: listing?.price ?? "",
  title: listing?.title ?? "",
  municipality: listing?.municipality ?? "",
  bedrooms: listing?.bedrooms ?? "",
  surfaceM2: listing?.surfaceM2 ?? "",
  epc: listing?.epc ?? "",
  notes: listing?.notes ?? "",
  status: listing?.status ?? "new",
  isFavorite: listing?.isFavorite ?? false,
  thumbnailFileId: listing?.thumbnailFileId ?? null,
});

const nullableNum = (v: number | ""): number | null =>
  v === "" ? null : Number(v);

export default function ListingForm({
  listing,
  submitting,
  onSubmit,
  onCancel,
}: {
  listing?: ListingWithId;
  submitting: boolean;
  onSubmit: (input: ListingInput) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslate("listings");
  const [autofilling, setAutofilling] = useState(false);

  const form = useForm<ListingFormValues>({
    initialValues: toFormValues(listing),
    validate: {
      url: (v) => (v.trim() ? null : t("form.required")),
      price: (v) => (v === "" ? t("form.required") : null),
      transactionType: (v) => (v ? null : t("form.required")),
    },
  });

  const opts = <T extends string>(values: readonly T[], ns: string) =>
    values.map((value) => ({ value, label: t(`${ns}.${value}`) }));

  // Pull title/price/notes from the listing page — fills only empty fields.
  const handleAutofill = async () => {
    setAutofilling(true);
    try {
      const p = await fetchListingPreview(form.values.url.trim());
      let filled = 0;
      if (p.title && !form.values.title.trim()) {
        form.setFieldValue("title", p.title);
        filled++;
      }
      if (p.price != null && form.values.price === "") {
        form.setFieldValue("price", p.price);
        filled++;
      }
      if (p.description && !form.values.notes.trim()) {
        form.setFieldValue("notes", p.description);
        filled++;
      }
      notifications.show(
        filled > 0
          ? { color: "green", message: t("form.autofillDone") }
          : { color: "yellow", message: t("form.autofillEmpty") }
      );
    } catch {
      notifications.show({ color: "red", message: t("form.autofillError") });
    } finally {
      setAutofilling(false);
    }
  };

  const handleSubmit = form.onSubmit((v) => {
    const input: ListingInput = {
      url: v.url.trim(),
      transactionType: v.transactionType,
      price: Number(v.price),
      title: v.title.trim(),
      municipality: v.municipality.trim(),
      bedrooms: nullableNum(v.bedrooms),
      surfaceM2: nullableNum(v.surfaceM2),
      epc: v.epc === "" ? null : v.epc,
      notes: v.notes.trim(),
      status: v.status,
      isFavorite: v.isFavorite,
      thumbnailFileId: v.thumbnailFileId,
    };
    onSubmit(input);
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label={t("form.url")}
          placeholder="https://www.immoweb.be/..."
          withAsterisk
          {...form.getInputProps("url")}
        />
        <Group justify="flex-end" mt={-8}>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconWand size={14} />}
            loading={autofilling}
            disabled={!isValidHttpUrl(form.values.url)}
            onClick={handleAutofill}
          >
            {t("form.autofill")}
          </Button>
        </Group>

        <TextInput
          label={t("form.title")}
          placeholder={t("form.titlePlaceholder")}
          {...form.getInputProps("title")}
        />

        <Group grow>
          <Select
            label={t("form.transactionType")}
            data={opts(TRANSACTION_TYPES, "transactionType")}
            allowDeselect={false}
            withAsterisk
            {...form.getInputProps("transactionType")}
          />
          <NumberInput
            label={t("form.price")}
            thousandSeparator=" "
            prefix="€ "
            min={0}
            withAsterisk
            {...form.getInputProps("price")}
          />
        </Group>

        <Group grow>
          <TextInput
            label={t("form.municipality")}
            {...form.getInputProps("municipality")}
          />
          <NumberInput
            label={t("form.bedrooms")}
            min={0}
            {...form.getInputProps("bedrooms")}
          />
        </Group>

        <Group grow>
          <NumberInput
            label={t("form.surfaceM2")}
            min={0}
            suffix=" m²"
            {...form.getInputProps("surfaceM2")}
          />
          <Select
            label={t("form.epc")}
            data={EPC_LABELS.map((v) => ({ value: v, label: v }))}
            clearable
            placeholder="—"
            {...form.getInputProps("epc")}
          />
        </Group>

        <Group grow align="center">
          <Select
            label={t("form.status")}
            data={opts(LISTING_STATUSES, "status")}
            allowDeselect={false}
            {...form.getInputProps("status")}
          />
          <Switch
            label={t("form.favorite")}
            mt="xl"
            {...form.getInputProps("isFavorite", { type: "checkbox" })}
          />
        </Group>

        <Textarea
          label={t("form.notes")}
          autosize
          minRows={2}
          maxRows={6}
          {...form.getInputProps("notes")}
        />

        {/* Thumbnail upload (Google Drive shared folder) */}
        <ThumbnailField
          value={form.values.thumbnailFileId}
          onChange={(id) => form.setFieldValue("thumbnailFileId", id)}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="default" type="button" onClick={onCancel}>
            {t("form.cancel")}
          </Button>
          <Button type="submit" loading={submitting} variant="gradient">
            {listing ? t("form.save") : t("form.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
