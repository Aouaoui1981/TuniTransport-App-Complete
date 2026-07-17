// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — design tokens · thème « Méditerranée »
// Palette premium & accessible (WCAG AA) : bleu mer profond, sarcelle,
// ambre/sable chaud. Toutes les clés historiques sont conservées afin que
// chaque écran bénéficie du rafraîchissement sans modification.
// ──────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════
// Thème « Méditerranée nuit » — Dark Premium (appliqué à toute l'application).
// Les valeurs sont sombres ; toutes les clés historiques sont conservées afin
// que chaque écran passe en sombre sans modification. Les variantes « *Light »
// deviennent des teintes translucides (fonds de pastilles/badges sur sombre).
// ══════════════════════════════════════════════════════════════════════════
export const COLORS = {
  // Primaire — bleu lumineux (lisible sur fond sombre)
  primary: '#3D82F6',
  primaryDark: '#2563EB',
  primaryLight: 'rgba(61,130,246,0.16)',
  // Secondaire — sarcelle méditerranéenne vive
  secondary: '#2DD4BF',
  secondaryDark: '#14B8A6',
  secondaryLight: 'rgba(45,212,191,0.16)',
  // Accent — ambre / sable chaud
  accent: '#F5B342',
  accentDark: '#E8890C',
  accentLight: 'rgba(245,179,66,0.16)',
  // Sémantique d'état (teintes claires pour contraste sur sombre)
  danger: '#F87171',
  dangerLight: 'rgba(248,113,113,0.16)',
  success: '#34D399',
  successLight: 'rgba(52,211,153,0.16)',
  warning: '#FBBF24',
  warningLight: 'rgba(251,191,36,0.16)',
  info: '#3D82F6',
  infoLight: 'rgba(61,130,246,0.16)',
  // Surfaces & fonds (jamais de noir pur)
  background: '#0A1420',
  surface: '#101E2E',
  surfaceAlt: '#16273A',
  muted: '#16273A',
  // Texte (blanc cassé → gris bleuté)
  text: '#EDF2F8',
  textSecondary: '#9DB0C4',
  // Éclairci pour la lisibilité des indices/placeholders (~4.7:1 sur surface)
  textLight: '#7E8EA1',
  onPrimary: '#FFFFFF',
  onAccent: '#0A1420',
  // Bordures translucides (visibles sur sombre)
  border: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.06)',
  // Utilitaires
  white: '#FFFFFF',
  ring: '#3D82F6',
  // Voile / scrim des modales & feuilles (≈ 66 % — legibilité du 1er plan)
  overlay: 'rgba(2, 6, 12, 0.66)',
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
  // Famille d'affichage « Plus Jakarta Sans » (chargée dans App.tsx via
  // @expo-google-fonts). Si le chargement échoue, RN retombe sur la police
  // système. Utilisée sur les titres/affichage ; le corps reste en système.
  family: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extrabold: 'PlusJakartaSans_800ExtraBold',
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
  // Ombre profonde « surélevée » — effet 3D (carte qui flotte au-dessus du fond)
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// Biseau 3D : liseré clair en haut (lumière) + liseré sombre en bas (ombre).
// À étaler sur une carte pour lui donner un relief « extrudé » sur fond sombre.
export const BEVEL = {
  borderTopColor: 'rgba(255,255,255,0.14)',
  borderBottomColor: 'rgba(0,0,0,0.35)',
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
