// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — design tokens · thème « Méditerranée »
// Palette premium & accessible (WCAG AA) : bleu mer profond, sarcelle,
// ambre/sable chaud. Toutes les clés historiques sont conservées afin que
// chaque écran bénéficie du rafraîchissement sans modification.
// ──────────────────────────────────────────────────────────────────────────

export const COLORS = {
  // Primaire — bleu Méditerranée profond (contraste ≈ 7.1:1 sur blanc)
  primary: '#1257A5',
  primaryDark: '#0C3F7A',
  primaryLight: '#E4EEF9',
  // Secondaire — sarcelle méditerranéenne
  secondary: '#0D9488',
  secondaryDark: '#0F766E',
  secondaryLight: '#D5F2EE',
  // Accent — ambre / sable chaud (soleil, mise en avant)
  accent: '#E8890C',
  accentDark: '#B45309',
  accentLight: '#FEF0D9',
  // Sémantique d'état
  danger: '#DC2626',
  dangerLight: '#FDE7E7',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#2563EB',
  infoLight: '#DBEAFE',
  // Surfaces & fonds
  background: '#F3F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF2F8',
  muted: '#E9EFF6',
  // Texte (encre bleu-marine, plus chaleureuse que le slate pur)
  text: '#0F2438',
  textSecondary: '#51617A',
  textLight: '#90A0B5',
  onPrimary: '#FFFFFF',
  onAccent: '#FFFFFF',
  // Bordures
  border: '#E1E8F0',
  borderLight: '#EFF3F8',
  // Utilitaires
  white: '#FFFFFF',
  ring: '#1257A5',
  // Voile / scrim des modales & feuilles (≈ 55 % — legibilité du 1er plan)
  overlay: 'rgba(9, 23, 38, 0.55)',
} as const;

// Dégradés prêts à l'emploi pour expo-linear-gradient
export const GRADIENTS = {
  // En-têtes héro, cartes de suivi
  sea: ['#1257A5', '#0D9488'] as const,
  // Appels à l'action chaleureux, badges « livré »
  sunset: ['#E8890C', '#DC2626'] as const,
  // Surfaces subtiles
  mist: ['#F3F7FB', '#E4EEF9'] as const,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const FONTS = {
  // Famille recommandée : « Plus Jakarta Sans » (lisible sur mobile, compatible
  // Dynamic Type iOS / mise à l'échelle Android). Tant qu'elle n'est pas chargée
  // via expo-font, RN retombe proprement sur la police système.
  family: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    title: 32,
  },
  // Interlignes (1.2 titres → 1.5 corps de texte)
  lineHeights: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
  },
} as const;

// Élévation premium — ombres teintées bleu-marine (plus douces & cohérentes)
export const SHADOWS = {
  xs: {
    shadowColor: '#0F2438',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1.5,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F2438',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F2438',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F2438',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 8,
  },
  // Ombre colorée pour les CTA primaires (halo bleu Méditerranée)
  primary: {
    shadowColor: '#1257A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────
// Thème sombre « Méditerranée nuit » — Dark Premium (cinématique, lueurs)
// Tokens additionnels, n'affectent pas les écrans clairs existants.
// ──────────────────────────────────────────────────────────────────────────
export const DARK = {
  colors: {
    bgDeep: '#050B12',
    bgBase: '#0A1420',
    surface: '#101E2E',
    surfaceGlass: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.14)',
    text: '#EDF2F8',
    textSecondary: '#9DB0C4',
    textLight: '#63788E',
    primary: '#3D82F6',
    secondary: '#2DD4BF',
    accent: '#F5B342',
    white: '#FFFFFF',
    // Voiles de lumière d'ambiance
    glowBlue: 'rgba(37,99,235,0.20)',
    glowTeal: 'rgba(13,148,136,0.16)',
  },
  gradients: {
    // Fond d'écran cinématique (3 arrêts, jamais de noir pur)
    base: ['#0E1C2C', '#0A1420', '#050B12'] as const,
    // Bouton CTA lumineux bleu → sarcelle
    cta: ['#2563EB', '#0D9488'] as const,
    // Bandeau de statistiques
    stats: ['#12314F', '#0C2233'] as const,
    // Lueur douce (vers transparent) pour blobs d'ambiance
    glow: ['rgba(37,99,235,0.22)', 'rgba(37,99,235,0)'] as const,
  },
  shadows: {
    // Halo lumineux derrière le CTA primaire
    glowPrimary: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 22,
      elevation: 10,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 6,
    },
  },
} as const;
