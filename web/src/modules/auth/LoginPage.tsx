import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandGoogle, IconHomeSearch } from "@tabler/icons-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@global/firebase/useAuth";
import { useTranslate } from "@global/localization";
import LanguageSelect from "@common/languageSelect";
import { authErrorKey } from "./authErrors";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { t } = useTranslate("auth");
  const { t: tc, tL } = useTranslate("common");
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={tL("/app")} replace />;
  }

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate(tL("/app"));
    } catch (err) {
      notifications.show({ color: "red", message: t(authErrorKey(err)) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flex mih="100vh">
      {/* Brand panel (desktop only) */}
      <Box
        visibleFrom="md"
        flex={1}
        p={48}
        pos="relative"
        style={{
          overflow: "hidden",
          background: "linear-gradient(135deg, #10b981, #06b6d4)",
        }}
      >
        <Box
          aria-hidden
          pos="absolute"
          inset={0}
          style={{
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 78% 18%, rgba(255,255,255,0.28), transparent 46%)",
          }}
        />
        <Flex h="100%" direction="column" justify="space-between" pos="relative">
          <Link
            to={tL("/")}
            style={{ textDecoration: "none", width: "fit-content" }}
          >
            <Group gap="xs">
              <ThemeIcon variant="white" size={34} radius="md" color="brand">
                <IconHomeSearch size={20} />
              </ThemeIcon>
              <Text ff="heading" fw={700} fz="lg" c="white">
                {tc("brand")}
              </Text>
            </Group>
          </Link>

          <Stack gap="sm" maw={440}>
            <Title order={2} c="white" fz={40} lh={1.1}>
              {t("panel.title")}
            </Title>
            <Text c="white" opacity={0.9}>
              {t("panel.subtitle")}
            </Text>
          </Stack>

          <span />
        </Flex>
      </Box>

      {/* Sign-in */}
      <Flex flex={1} align="center" justify="center" p="lg" pos="relative">
        <Box pos="absolute" top={16} right={16}>
          <LanguageSelect />
        </Box>
        <Box w="100%" maw={400}>
          <Stack gap="lg">
            <Group hiddenFrom="md" justify="center">
              <Link
                to={tL("/")}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Group gap="xs">
                  <ThemeIcon variant="gradient" size={32} radius="md">
                    <IconHomeSearch size={18} />
                  </ThemeIcon>
                  <Text ff="heading" fw={700} fz="lg">
                    {tc("brand")}
                  </Text>
                </Group>
              </Link>
            </Group>

            <div>
              <Title order={2}>{t("signIn.title")}</Title>
              <Text c="dimmed" size="sm">
                {t("signIn.subtitle")}
              </Text>
            </div>

            <Button
              fullWidth
              size="md"
              radius="md"
              loading={submitting}
              leftSection={<IconBrandGoogle size={18} />}
              variant="gradient"
              onClick={handleGoogle}
            >
              {t("google")}
            </Button>

            <Text size="xs" ta="center" c="dimmed">
              {t("signIn.restricted")}
            </Text>
          </Stack>
        </Box>
      </Flex>
    </Flex>
  );
}
