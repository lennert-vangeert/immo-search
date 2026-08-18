import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconExternalLink,
  IconPencil,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@global/firebase/useAuth";
import { useTranslate } from "@global/localization";
import { LISTING_STATUSES, type ListingStatus } from "@data/listings";
import {
  deleteListing,
  updateListing,
  type ListingInput,
} from "@services/listings";
import { deleteDriveFile, driveThumbUrl, hasDriveConsent } from "@services/drive";
import { useListings } from "./useListings";
import ListingForm from "./ListingForm";
import Reactions from "./Reactions";
import {
  epcColor,
  formatPrice,
  formatPricePerM2,
  hostnameOf,
  isValidHttpUrl,
  listingLabel,
  pricePerM2,
  statusColor,
} from "./listingUi";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tL } = useTranslate("listings");
  const { listings, loading } = useListings();
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const listing = listings.find((l) => l.id === id);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  if (!listing) {
    return (
      <Container size="lg" py="xl">
        <Stack align="center" gap="sm">
          <Text c="dimmed">{t("detail.notFound")}</Text>
          <Button variant="light" onClick={() => navigate(tL("/app"))}>
            {t("detail.back")}
          </Button>
        </Stack>
      </Container>
    );
  }

  const label = listingLabel(listing, t("untitled"));
  const priceSuffix =
    listing.transactionType === "rent" ? ` ${t("perMonth")}` : "";

  const handleEditSubmit = async (input: ListingInput) => {
    setSubmitting(true);
    try {
      await updateListing(listing.id, input);
      notifications.show({
        message: t("notifications.updated"),
        color: "green",
      });
      setEditOpen(false);
    } catch {
      notifications.show({ color: "red", message: t("notifications.error") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status: ListingStatus) => {
    try {
      await updateListing(listing.id, { status });
    } catch {
      notifications.show({ color: "red", message: t("notifications.error") });
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await updateListing(listing.id, { isFavorite: !listing.isFavorite });
    } catch {
      notifications.show({ color: "red", message: t("notifications.error") });
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: t("confirmDelete.title"),
      children: <Text size="sm">{t("confirmDelete.body", { name: label })}</Text>,
      labels: { confirm: t("confirmDelete.confirm"), cancel: t("form.cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteListing(listing.id);
          if (listing.thumbnailFileId && user && hasDriveConsent(user.uid)) {
            deleteDriveFile(listing.thumbnailFileId).catch(() => undefined);
          }
          notifications.show({
            message: t("notifications.deleted"),
            color: "green",
          });
          navigate(tL("/app"));
        } catch {
          notifications.show({
            color: "red",
            message: t("notifications.error"),
          });
        }
      },
    });
  };

  const ppm2 = pricePerM2(listing);
  const facts: { label: string; value: string }[] = [
    { label: t("table.type"), value: t(`transactionType.${listing.transactionType}`) },
    { label: t("table.price"), value: `${formatPrice(listing.price)}${priceSuffix}` },
  ];
  if (ppm2 != null)
    facts.push({ label: t("table.pricePerM2"), value: formatPricePerM2(ppm2) });
  if (listing.municipality)
    facts.push({ label: t("form.municipality"), value: listing.municipality });
  if (listing.bedrooms != null)
    facts.push({ label: t("table.bedrooms"), value: String(listing.bedrooms) });
  if (listing.surfaceM2 != null)
    facts.push({ label: t("table.surface"), value: `${listing.surfaceM2} m²` });

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="md">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(tL("/app"))}
        >
          {t("detail.back")}
        </Button>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color={listing.isFavorite ? "yellow" : "gray"}
            size="lg"
            aria-label={t("actions.favorite")}
            onClick={handleToggleFavorite}
          >
            {listing.isFavorite ? (
              <IconStarFilled size={18} />
            ) : (
              <IconStar size={18} />
            )}
          </ActionIcon>
          <ActionIcon
            variant="light"
            size="lg"
            aria-label={t("actions.edit")}
            onClick={() => setEditOpen(true)}
          >
            <IconPencil size={18} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            size="lg"
            aria-label={t("actions.delete")}
            onClick={handleDelete}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <Grid gutter="lg">
        {/* Preview pane */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
            <Box
              pos="relative"
              style={{ height: 520, background: "var(--mantine-color-body)" }}
            >
              {listing.thumbnailFileId ? (
                // Prefer the saved image — reliable, no embedding issues.
                <Image
                  src={driveThumbUrl(listing.thumbnailFileId)}
                  h="100%"
                  w="100%"
                  fit="contain"
                  alt={label}
                  fallbackSrc="https://placehold.co/600x400?text=No+image"
                />
              ) : isValidHttpUrl(listing.url) ? (
                <>
                  {/* Fallback underneath; the iframe covers it if the site allows it. */}
                  <Stack
                    align="center"
                    justify="center"
                    gap="sm"
                    pos="absolute"
                    inset={0}
                    p="xl"
                  >
                    <Text c="dimmed" size="sm" ta="center" maw={360}>
                      {t("detail.previewBlocked")}
                    </Text>
                    <Button
                      component="a"
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="gradient"
                      rightSection={<IconExternalLink size={16} />}
                    >
                      {t("detail.openListing")}
                    </Button>
                  </Stack>

                  <iframe
                    src={listing.url}
                    title={label}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      border: 0,
                    }}
                  />
                </>
              ) : (
                <Stack
                  align="center"
                  justify="center"
                  pos="absolute"
                  inset={0}
                  p="xl"
                >
                  <Text c="dimmed" size="sm" ta="center" maw={360}>
                    {t("detail.noPreview")}
                  </Text>
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid.Col>

        {/* Info pane */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="md">
            <div>
              <Group gap="xs" mb={4}>
                <Badge
                  variant="light"
                  color={listing.transactionType === "rent" ? "cyan" : "brand"}
                >
                  {t(`transactionType.${listing.transactionType}`)}
                </Badge>
                {listing.epc && (
                  <Badge variant="light" color={epcColor(listing.epc)}>
                    EPC {listing.epc}
                  </Badge>
                )}
              </Group>
              <Title order={2}>{label}</Title>
              <Anchor
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
              >
                {hostnameOf(listing.url) || listing.url}
              </Anchor>
            </div>

            <Text fw={800} fz={28} variant="gradient">
              {formatPrice(listing.price)}
              {priceSuffix}
            </Text>

            <Select
              label={t("form.status")}
              data={LISTING_STATUSES.map((s) => ({
                value: s,
                label: t(`status.${s}`),
              }))}
              value={listing.status}
              onChange={(v) => v && handleStatusChange(v as ListingStatus)}
              allowDeselect={false}
              leftSection={
                <Box
                  w={10}
                  h={10}
                  style={{
                    borderRadius: "50%",
                    backgroundColor: `var(--mantine-color-${statusColor(
                      listing.status
                    )}-6)`,
                  }}
                />
              }
              maw={240}
            />

            <Card withBorder radius="md" padding="md">
              <Stack gap={6}>
                {facts.map((f) => (
                  <Group key={f.label} justify="space-between">
                    <Text size="sm" c="dimmed">
                      {f.label}
                    </Text>
                    <Text size="sm" fw={600}>
                      {f.value}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>

            <Card withBorder radius="md" padding="md">
              <Text size="sm" fw={600} mb="xs">
                {t("reactions.title")}
              </Text>
              <Reactions listing={listing} />
            </Card>

            {listing.notes && (
              <Card withBorder radius="md" padding="md">
                <Text size="sm" fw={600} mb={4}>
                  {t("form.notes")}
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {listing.notes}
                </Text>
              </Card>
            )}

            <Button
              component="a"
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="light"
              rightSection={<IconExternalLink size={16} />}
            >
              {t("detail.openListing")}
            </Button>
          </Stack>
        </Grid.Col>
      </Grid>

      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("modal.edit")}
        size="lg"
      >
        <ListingForm
          listing={listing}
          submitting={submitting}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </Container>
  );
}
