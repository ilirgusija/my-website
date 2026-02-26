import { Icon, IconButton, useColorMode } from "@chakra-ui/react";
import { FiMoon, FiSun } from "react-icons/fi";

export function ThemeToggleButton({ size = "sm" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === "dark";

  return (
    <IconButton
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      icon={<Icon as={isDark ? FiSun : FiMoon} boxSize={4} />}
      variant="outline"
      size={size}
      onClick={toggleColorMode}
      borderColor="border.subtle"
      color="text.muted"
      _hover={{ color: "text.primary", bg: "bg.surface" }}
    />
  );
}
