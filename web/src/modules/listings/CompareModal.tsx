import { Anchor, Badge, Image, Modal, Table, Text } from "@mantine/core";
import { EPC_LABELS } from "@data/listings";
import type { ListingWithId } from "@services/listings";
import { driveThumbUrl } from "@services/drive";
import { useTranslate } from "@global/localization";
import {
  epcColor,
  formatPrice,
  formatPricePerM2,
  hostnameOf,
  listingLabel,
  pricePerM2,
  statusColor,
} from "./listingUi";

/** Index of the "best" value in a numeric row, or -1. Nulls ignored. */
const bestIndex = (vals: (number | null)[], dir: "min" | "max"): number => {
  let best = -1;
  let bestVal: number | null = null;
  vals.forEach((v, i) => {
    if (v == null) return;
    if (bestVal == null || (dir === "min" ? v < bestVal : v > bestVal)) {
      bestVal = v;
      best = i;
    }
  });
  return best;
};

export default function CompareModal({
  listings,
  opened,
  onClose,
}: {
  listings: ListingWithId[];
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslate("listings");

  // Precompute "best" cell per numeric row.
  const priceBest = bestIndex(listings.map((l) => l.price), "min");
  const ppm2Best = bestIndex(listings.map((l) => pricePerM2(l)), "min");
  const bedsBest = bestIndex(listings.map((l) => l.bedrooms), "max");
  const surfBest = bestIndex(listings.map((l) => l.surfaceM2), "max");
  const epcBest = bestIndex(
    listings.map((l) => (l.epc ? EPC_LABELS.indexOf(l.epc) : null)),
    "min"
  );

  const strong = (isBest: boolean) =>
    isBest ? { fw: 700 as const, c: "brand" } : {};

  const Row = ({
    label,
    render,
  }: {
    label: string;
    render: (l: ListingWithId, i: number) => React.ReactNode;
  }) => (
    <Table.Tr>
      <Table.Th style={{ whiteSpace: "nowrap" }}>{label}</Table.Th>
      {listings.map((l, i) => (
        <Table.Td key={l.id}>{render(l, i)}</Table.Td>
      ))}
    </Table.Tr>
  );

  return (
    <Modal opened={opened} onClose={onClose} title={t("compare.title")} size="xl">
      <Table.ScrollContainer minWidth={320 + listings.length * 160}>
        <Table withRowBorders verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th />
              {listings.map((l) => (
                <Table.Th key={l.id}>
                  <Image
                    src={l.thumbnailFileId ? driveThumbUrl(l.thumbnailFileId, 200) : null}
                    h={80}
                    radius="md"
                    fit="cover"
                    alt=""
                    fallbackSrc="https://placehold.co/200x120?text=%20"
                    mb={6}
                  />
                  <Anchor href={l.url} target="_blank" rel="noopener noreferrer" fw={600} lineClamp={2}>
                    {listingLabel(l, hostnameOf(l.url) || t("untitled"))}
                  </Anchor>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Row
              label={t("table.type")}
              render={(l) => (
                <Badge variant="light" color={l.transactionType === "rent" ? "cyan" : "brand"}>
                  {t(`transactionType.${l.transactionType}`)}
                </Badge>
              )}
            />
            <Row
              label={t("table.price")}
              render={(l, i) => (
                <Text {...strong(i === priceBest)}>
                  {formatPrice(l.price)}
                  {l.transactionType === "rent" ? ` ${t("perMonth")}` : ""}
                </Text>
              )}
            />
            <Row
              label={t("table.pricePerM2")}
              render={(l, i) => (
                <Text {...strong(i === ppm2Best)}>{formatPricePerM2(pricePerM2(l))}</Text>
              )}
            />
            <Row
              label={t("table.bedrooms")}
              render={(l, i) => (
                <Text {...strong(i === bedsBest)}>{l.bedrooms ?? "—"}</Text>
              )}
            />
            <Row
              label={t("table.surface")}
              render={(l, i) => (
                <Text {...strong(i === surfBest)}>
                  {l.surfaceM2 != null ? `${l.surfaceM2} m²` : "—"}
                </Text>
              )}
            />
            <Row
              label={t("table.epc")}
              render={(l, i) =>
                l.epc ? (
                  <Badge variant={i === epcBest ? "filled" : "light"} color={epcColor(l.epc)}>
                    {l.epc}
                  </Badge>
                ) : (
                  "—"
                )
              }
            />
            <Row
              label={t("form.municipality")}
              render={(l) => l.municipality || "—"}
            />
            <Row
              label={t("table.status")}
              render={(l) => (
                <Badge variant="dot" color={statusColor(l.status)}>
                  {t(`status.${l.status}`)}
                </Badge>
              )}
            />
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Modal>
  );
}
