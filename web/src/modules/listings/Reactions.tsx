import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import { useAuth } from "@global/firebase/useAuth";
import { useTranslate } from "@global/localization";
import { setReaction, type ListingWithId } from "@services/listings";
import type { Reaction } from "@data/listings";
import { useUserName } from "./useUserName";

const GREEN = "var(--mantine-color-green-6)";
const RED = "var(--mantine-color-red-6)";

/** A static thumb showing someone else's reaction. */
function PartnerThumb({ reaction, size }: { reaction: Reaction; size: number }) {
  return (
    <span style={{ display: "inline-flex" }}>
      {reaction === "up" ? (
        <IconThumbUpFilled size={size} color={GREEN} />
      ) : (
        <IconThumbDownFilled size={size} color={RED} />
      )}
    </span>
  );
}

/**
 * Per-person 👍/👎. The current user's thumbs are interactive; the partner's is
 * shown read-only. `compact` renders a tight inline form for cards/table rows.
 */
export default function Reactions({
  listing,
  compact = false,
}: {
  listing: ListingWithId;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { t } = useTranslate("listings");
  const uid = user?.uid ?? "";
  const reactions = listing.reactions ?? {};
  const mine = reactions[uid];
  const partner = Object.entries(reactions).find(([k]) => k !== uid);
  const partnerName = useUserName(partner?.[0]);

  const toggle = (r: Reaction) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!uid) return;
    void setReaction(listing.id, uid, mine === r ? null : r).catch(
      () => undefined
    );
  };

  const iconSize = compact ? 15 : 18;
  const btnSize = compact ? "sm" : "md";

  const myButtons = (
    <Group gap={2} wrap="nowrap">
      <ActionIcon
        variant={mine === "up" ? "filled" : "subtle"}
        color="green"
        size={btnSize}
        aria-label={t("reactions.up")}
        onClick={toggle("up")}
      >
        {mine === "up" ? (
          <IconThumbUpFilled size={iconSize} />
        ) : (
          <IconThumbUp size={iconSize} />
        )}
      </ActionIcon>
      <ActionIcon
        variant={mine === "down" ? "filled" : "subtle"}
        color="red"
        size={btnSize}
        aria-label={t("reactions.down")}
        onClick={toggle("down")}
      >
        {mine === "down" ? (
          <IconThumbDownFilled size={iconSize} />
        ) : (
          <IconThumbDown size={iconSize} />
        )}
      </ActionIcon>
    </Group>
  );

  if (compact) {
    return (
      <Group gap={8} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
        {myButtons}
        {partner && (
          <Tooltip label={partnerName || t("reactions.partner")} withArrow>
            <PartnerThumb reaction={partner[1]} size={14} />
          </Tooltip>
        )}
      </Group>
    );
  }

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {t("reactions.you")}
        </Text>
        {myButtons}
      </Group>
      <Group justify="space-between">
        <Text size="sm" c="dimmed" lineClamp={1}>
          {partnerName || t("reactions.partner")}
        </Text>
        {partner ? (
          <PartnerThumb reaction={partner[1]} size={18} />
        ) : (
          <Text size="sm" c="dimmed">
            {t("reactions.none")}
          </Text>
        )}
      </Group>
    </Stack>
  );
}
