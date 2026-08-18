import { useMemo, useState } from "react";
import {
  Affix,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAdjustmentsHorizontal,
  IconArrowsSort,
  IconColumns,
  IconLayoutGrid,
  IconList,
  IconPlus,
  IconStar,
  IconX,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@global/firebase/useAuth";
import { deleteDriveFile, hasDriveConsent } from "@services/drive";
import { useTranslate } from "@global/localization";
import type { AppDispatch, RootState } from "@global/store/store";
import { setListingsView } from "@global/store/uiSlice";
import { LISTING_STATUSES } from "@data/listings";
import {
  createListing,
  deleteListing,
  updateListing,
  type ListingInput,
  type ListingWithId,
} from "@services/listings";
import { useListings } from "./useListings";
import ListingForm from "./ListingForm";
import ListingsTable from "./ListingsTable";
import ListingsCards from "./ListingsCards";
import CompareModal from "./CompareModal";
import {
  DEFAULT_FILTERS,
  filterAndSortListings,
  listingLabel,
  type ListingFilters,
  type SortDir,
  type SortKey,
} from "./listingUi";

export default function ListingsPage() {
  const { user } = useAuth();
  const { t, tL } = useTranslate("listings");
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const view = useSelector((s: RootState) => s.ui.listingsView);
  const { listings, loading } = useListings();

  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<ListingWithId | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOpen, { open: openCompare, close: closeCompare }] =
    useDisclosure(false);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= 3) {
        notifications.show({ color: "yellow", message: t("compare.max") });
        return prev;
      } else {
        next.add(id);
      }
      return next;
    });

  const selectedListings = listings.filter((l) => selected.has(l.id));

  const visible = useMemo(
    () => filterAndSortListings(listings, filters, sortKey, sortDir),
    [listings, filters, sortKey, sortDir]
  );

  const startCreate = () => {
    setEditing(undefined);
    open();
  };
  const startEdit = (l: ListingWithId) => {
    setEditing(l);
    open();
  };
  const openDetail = (l: ListingWithId) => navigate(tL(`/app/listings/${l.id}`));

  const handleSubmit = async (input: ListingInput) => {
    if (!user) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateListing(editing.id, input);
        notifications.show({
          message: t("notifications.updated"),
          color: "green",
        });
      } else {
        await createListing(user.uid, input);
        notifications.show({
          message: t("notifications.created"),
          color: "green",
        });
      }
      close();
    } catch {
      notifications.show({ color: "red", message: t("notifications.error") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (l: ListingWithId) => {
    modals.openConfirmModal({
      title: t("confirmDelete.title"),
      children: (
        <Text size="sm">
          {t("confirmDelete.body", { name: listingLabel(l, t("untitled")) })}
        </Text>
      ),
      labels: { confirm: t("confirmDelete.confirm"), cancel: t("form.cancel") },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteListing(l.id);
          // Best-effort: remove the thumbnail from Drive too (no popup — only
          // when this account has already consented).
          if (l.thumbnailFileId && user && hasDriveConsent(user.uid)) {
            deleteDriveFile(l.thumbnailFileId).catch(() => undefined);
          }
          notifications.show({
            message: t("notifications.deleted"),
            color: "green",
          });
        } catch {
          notifications.show({
            color: "red",
            message: t("notifications.error"),
          });
        }
      },
    });
  };

  const handleToggleFavorite = async (l: ListingWithId) => {
    try {
      await updateListing(l.id, { isFavorite: !l.isFavorite });
    } catch {
      notifications.show({ color: "red", message: t("notifications.error") });
    }
  };

  const sortOptions = [
    { value: "newest", label: t("sort.newest") },
    { value: "price", label: t("sort.price") },
    { value: "pricePerM2", label: t("sort.pricePerM2") },
    { value: "surface", label: t("sort.surface") },
    { value: "bedrooms", label: t("sort.bedrooms") },
    { value: "epc", label: t("sort.epc") },
  ];

  const handleSortClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "epc" ? "asc" : "desc");
    }
  };

  const activeFilterCount =
    (filters.transactionType !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0);

  // Filter/sort controls, reused inline (desktop) and inside a popover (mobile).
  const typeSelect = (full: boolean) => (
    <Select
      aria-label={t("filters.type")}
      w={full ? "100%" : 140}
      data={[
        { value: "all", label: t("filters.allTypes") },
        { value: "buy", label: t("transactionType.buy") },
        { value: "rent", label: t("transactionType.rent") },
      ]}
      value={filters.transactionType}
      onChange={(v) =>
        setFilters((f) => ({
          ...f,
          transactionType: (v as ListingFilters["transactionType"]) ?? "all",
        }))
      }
      allowDeselect={false}
    />
  );

  const statusSelect = (full: boolean) => (
    <Select
      aria-label={t("filters.status")}
      w={full ? "100%" : 150}
      data={[
        { value: "all", label: t("filters.allStatuses") },
        ...LISTING_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
      ]}
      value={filters.status}
      onChange={(v) =>
        setFilters((f) => ({
          ...f,
          status: (v as ListingFilters["status"]) ?? "all",
        }))
      }
      allowDeselect={false}
    />
  );

  const favSwitch = (
    <Switch
      label={
        <Group gap={4} wrap="nowrap">
          <IconStar size={14} />
          <Text size="sm">{t("filters.favoritesOnly")}</Text>
        </Group>
      }
      checked={filters.favoritesOnly}
      onChange={(e) =>
        setFilters((f) => ({ ...f, favoritesOnly: e.currentTarget.checked }))
      }
    />
  );

  const sortSelect = (full: boolean) => (
    <Select
      aria-label={t("sort.label")}
      leftSection={<IconArrowsSort size={16} />}
      w={full ? "100%" : 170}
      data={sortOptions}
      value={sortKey}
      onChange={(v) => v && setSortKey(v as SortKey)}
      allowDeselect={false}
    />
  );

  const viewToggle = (
    <SegmentedControl
      value={view}
      onChange={(v) => dispatch(setListingsView(v as "table" | "cards"))}
      data={[
        { value: "table", label: <IconList size={16} /> },
        { value: "cards", label: <IconLayoutGrid size={16} /> },
      ]}
    />
  );

  return (
    <Container size="lg">
      <Group justify="space-between" mb="lg">
        <Title order={2}>{t("title")}</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          variant="gradient"
          radius="md"
          onClick={startCreate}
        >
          {t("add")}
        </Button>
      </Group>

      {/* Toolbar — inline on desktop, collapsed into a popover on mobile */}
      <Group justify="space-between" mb="md" gap="sm" visibleFrom="sm">
        <Group gap="sm">
          {typeSelect(false)}
          {statusSelect(false)}
          {favSwitch}
        </Group>
        <Group gap="sm">
          {sortSelect(false)}
          {viewToggle}
        </Group>
      </Group>

      <Group justify="space-between" mb="md" gap="sm" hiddenFrom="sm">
        <Popover width={260} position="bottom-start" withArrow shadow="md">
          <Popover.Target>
            <Button
              variant="default"
              leftSection={<IconAdjustmentsHorizontal size={16} />}
              rightSection={
                activeFilterCount > 0 ? (
                  <Badge size="xs" circle variant="filled">
                    {activeFilterCount}
                  </Badge>
                ) : null
              }
            >
              {t("filters.button")}
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
              {typeSelect(true)}
              {statusSelect(true)}
              {favSwitch}
              {sortSelect(true)}
            </Stack>
          </Popover.Dropdown>
        </Popover>
        {viewToggle}
      </Group>

      {loading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : visible.length === 0 ? (
        <Stack align="center" py={64} gap="sm">
          <Text c="dimmed">
            {listings.length === 0 ? t("empty") : t("emptyFiltered")}
          </Text>
          {listings.length === 0 && (
            <Button
              leftSection={<IconPlus size={16} />}
              variant="light"
              onClick={startCreate}
            >
              {t("add")}
            </Button>
          )}
        </Stack>
      ) : view === "table" ? (
        <ListingsTable
          listings={visible}
          sortKey={sortKey}
          sortDir={sortDir}
          selected={selected}
          onSort={handleSortClick}
          onToggleSelect={toggleSelect}
          onOpen={openDetail}
          onEdit={startEdit}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : (
        <ListingsCards
          listings={visible}
          selected={selected}
          onToggleSelect={toggleSelect}
          onOpen={openDetail}
          onEdit={startEdit}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* Comparison action bar */}
      {selected.size > 0 && (
        <Affix position={{ bottom: 20, left: 0, right: 0 }}>
          <Group justify="center">
            <Paper shadow="md" radius="xl" p="xs" withBorder>
              <Group gap="xs" pl="sm">
                <Text size="sm" fw={500}>
                  {t("compare.selected", { count: selected.size })}
                </Text>
                <Button
                  size="xs"
                  radius="xl"
                  leftSection={<IconColumns size={16} />}
                  disabled={selected.size < 2}
                  onClick={openCompare}
                >
                  {t("compare.button")}
                </Button>
                <Button
                  size="xs"
                  radius="xl"
                  variant="subtle"
                  color="gray"
                  leftSection={<IconX size={16} />}
                  onClick={() => setSelected(new Set())}
                >
                  {t("compare.clear")}
                </Button>
              </Group>
            </Paper>
          </Group>
        </Affix>
      )}

      <CompareModal
        listings={selectedListings}
        opened={compareOpen && selectedListings.length >= 2}
        onClose={closeCompare}
      />

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? t("modal.edit") : t("modal.add")}
        size="lg"
      >
        <ListingForm
          key={editing?.id ?? "new"}
          listing={editing}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </Modal>
    </Container>
  );
}
