import {
  ActionIcon,
  Badge,
  Group,
  Image,
  Table,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconPencil,
  IconSelector,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react";
import type { ListingWithId } from "@services/listings";
import { driveThumbUrl } from "@services/drive";
import { useTranslate } from "@global/localization";
import {
  epcColor,
  formatPrice,
  listingLabel,
  statusColor,
  type SortDir,
  type SortKey,
} from "./listingUi";

type Props = {
  listings: ListingWithId[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onOpen: (l: ListingWithId) => void;
  onEdit: (l: ListingWithId) => void;
  onDelete: (l: ListingWithId) => void;
  onToggleFavorite: (l: ListingWithId) => void;
};

export default function ListingsTable({
  listings,
  sortKey,
  sortDir,
  onSort,
  onOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
}: Props) {
  const { t } = useTranslate("listings");

  const Th = ({
    label,
    sort,
    numeric,
  }: {
    label: string;
    sort?: SortKey;
    numeric?: boolean;
  }) => {
    if (!sort) {
      return (
        <Table.Th style={numeric ? { textAlign: "right" } : undefined}>
          {label}
        </Table.Th>
      );
    }
    const active = sortKey === sort;
    const Icon = !active
      ? IconSelector
      : sortDir === "asc"
        ? IconChevronUp
        : IconChevronDown;
    return (
      <Table.Th style={numeric ? { textAlign: "right" } : undefined}>
        <UnstyledButton onClick={() => onSort(sort)}>
          <Group gap={4} justify={numeric ? "flex-end" : "flex-start"} wrap="nowrap">
            <Text size="sm" fw={600} c={active ? "brand" : undefined}>
              {label}
            </Text>
            <Icon size={14} />
          </Group>
        </UnstyledButton>
      </Table.Th>
    );
  };

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table highlightOnHover verticalSpacing="sm" stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={56} />
            <Th label={t("table.name")} />
            <Th label={t("table.type")} />
            <Th label={t("table.price")} sort="price" numeric />
            <Th label={t("table.bedrooms")} sort="bedrooms" numeric />
            <Th label={t("table.surface")} sort="surface" numeric />
            <Th label={t("table.epc")} sort="epc" />
            <Th label={t("table.status")} />
            <Table.Th w={120} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {listings.map((l) => {
            const label = listingLabel(l, t("untitled"));
            return (
              <Table.Tr
                key={l.id}
                style={{ cursor: "pointer" }}
                onClick={() => onOpen(l)}
              >
                <Table.Td>
                  <Image
                    src={
                      l.thumbnailFileId
                        ? driveThumbUrl(l.thumbnailFileId, 100)
                        : null
                    }
                    w={44}
                    h={44}
                    radius="sm"
                    fit="cover"
                    alt=""
                    fallbackSrc="https://placehold.co/80x80?text=%20"
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color={l.isFavorite ? "yellow" : "gray"}
                      size="sm"
                      aria-label={t("actions.favorite")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(l);
                      }}
                    >
                      {l.isFavorite ? (
                        <IconStarFilled size={15} />
                      ) : (
                        <IconStar size={15} />
                      )}
                    </ActionIcon>
                    <Text fw={600} lineClamp={1}>
                      {label}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge
                    variant="light"
                    color={l.transactionType === "rent" ? "cyan" : "brand"}
                  >
                    {t(`transactionType.${l.transactionType}`)}
                  </Badge>
                </Table.Td>
                <Table.Td ta="right">
                  <Text fw={700}>{formatPrice(l.price)}</Text>
                </Table.Td>
                <Table.Td ta="right">{l.bedrooms ?? "—"}</Table.Td>
                <Table.Td ta="right">
                  {l.surfaceM2 != null ? `${l.surfaceM2} m²` : "—"}
                </Table.Td>
                <Table.Td>
                  {l.epc ? (
                    <Badge variant="light" color={epcColor(l.epc)}>
                      {l.epc}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge variant="dot" color={statusColor(l.status)}>
                    {t(`status.${l.status}`)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap" justify="flex-end">
                    <ActionIcon
                      variant="light"
                      aria-label={t("actions.edit")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(l);
                      }}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      aria-label={t("actions.delete")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(l);
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
