import {
  ActionIcon,
  Badge,
  Card,
  Group,
  Image,
  SimpleGrid,
  Text,
} from "@mantine/core";
import {
  IconBed,
  IconPencil,
  IconRuler2,
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
} from "./listingUi";

type Props = {
  listings: ListingWithId[];
  onOpen: (l: ListingWithId) => void;
  onEdit: (l: ListingWithId) => void;
  onDelete: (l: ListingWithId) => void;
  onToggleFavorite: (l: ListingWithId) => void;
};

export default function ListingsCards({
  listings,
  onOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
}: Props) {
  const { t } = useTranslate("listings");

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
      {listings.map((l) => {
        const label = listingLabel(l, t("untitled"));
        const priceSuffix =
          l.transactionType === "rent" ? ` ${t("perMonth")}` : "";
        return (
          <Card
            key={l.id}
            shadow="sm"
            padding="md"
            style={{ cursor: "pointer" }}
            onClick={() => onOpen(l)}
          >
            <Card.Section pos="relative">
              <Image
                src={l.thumbnailFileId ? driveThumbUrl(l.thumbnailFileId) : null}
                h={160}
                alt={label}
                fallbackSrc="https://placehold.co/600x400?text=No+image"
              />
              <ActionIcon
                variant="white"
                color={l.isFavorite ? "yellow" : "gray"}
                radius="xl"
                pos="absolute"
                top={8}
                right={8}
                aria-label={t("actions.favorite")}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(l);
                }}
              >
                {l.isFavorite ? (
                  <IconStarFilled size={16} />
                ) : (
                  <IconStar size={16} />
                )}
              </ActionIcon>
            </Card.Section>

            <Group justify="space-between" mt="md" wrap="nowrap">
              <Text fw={700} ff="heading" lineClamp={1}>
                {label}
              </Text>
              <Badge
                variant="light"
                color={l.transactionType === "rent" ? "cyan" : "brand"}
              >
                {t(`transactionType.${l.transactionType}`)}
              </Badge>
            </Group>

            {l.municipality && (
              <Text size="sm" c="dimmed">
                {l.municipality}
              </Text>
            )}

            <Text fw={800} fz="xl" variant="gradient" mt="xs">
              {formatPrice(l.price)}
              {priceSuffix}
            </Text>

            <Group gap="xs" mt="xs">
              {l.bedrooms != null && (
                <Badge
                  variant="default"
                  leftSection={<IconBed size={12} />}
                  size="sm"
                >
                  {l.bedrooms}
                </Badge>
              )}
              {l.surfaceM2 != null && (
                <Badge
                  variant="default"
                  leftSection={<IconRuler2 size={12} />}
                  size="sm"
                >
                  {l.surfaceM2} m²
                </Badge>
              )}
              {l.epc && (
                <Badge variant="light" color={epcColor(l.epc)} size="sm">
                  EPC {l.epc}
                </Badge>
              )}
            </Group>

            <Group justify="space-between" mt="md">
              <Badge variant="dot" color={statusColor(l.status)}>
                {t(`status.${l.status}`)}
              </Badge>
              <Group gap="xs">
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
            </Group>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
