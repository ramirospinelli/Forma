export const Colors = {
  // Brand
  primary: "#FF6B35",
  primaryDark: "#E85A24",
  primaryLight: "#FF8C5A",

  // Accent
  accent: "#4ECDC4",
  accentDark: "#3AB7AE",

  // Backgrounds
  bg: "#0a0a0f",
  bgCard: "#12121a",
  bgCardAlt: "#1a1a26",
  bgSurface: "#1e1e2d",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#9B9BB4",
  textMuted: "#5C5C7A",

  // Borders
  border: "#2a2a3d",
  borderLight: "#3a3a52",

  // Glass & Overlays
  glass: "rgba(255, 255, 255, 0.05)",
  glassHighlight: "rgba(255, 255, 255, 0.1)",
  overlay: "rgba(0, 0, 0, 0.6)",

  // Status
  success: "#4CAF7D",
  warning: "#FFB347",
  danger: "#FF5757",
  info: "#4ECDC4",

  // Activity types
  run: "#FF6B35",
  ride: "#4ECDC4",
  swim: "#45B7D1",
  walk: "#96CEB4",
  hike: "#88D8A3",
  strength: "#C77DFF",
  yoga: "#FFD93D",
  workout: "#FF6BD6",

  // Chart colors
  chartLine: "#FF6B35",
  chartFill: "rgba(255, 107, 53, 0.15)",
  chartGrid: "rgba(255, 255, 255, 0.05)",

  // Gradients
  gradientPrimary: ["#FF6B35", "#FF8C5A"] as const,
  gradientDark: ["#1a1a26", "#0a0a0f"] as const,
  gradientCard: ["#12121a", "#1a1a26"] as const,
};

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 42,
};

export const FontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;
