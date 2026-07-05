// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared components (STEP 3)
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../utils/theme';
import { ShipmentStatus } from '../types';

// ── StatusBadge ──────────────────────────────────────────────────────────

const STATUS_META: Record<ShipmentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: COLORS.accent, bg: COLORS.accentLight },
  accepted: { label: 'Accepté', color: COLORS.info, bg: COLORS.primaryLight },
  collected: { label: 'Récupéré', color: COLORS.primary, bg: COLORS.primaryLight },
  in_transit: { label: 'En transit', color: COLORS.secondary, bg: COLORS.secondaryLight },
  arrived: { label: 'Arrivé', color: COLORS.primaryDark, bg: COLORS.primaryLight },
  delivered: { label: 'Livré', color: COLORS.success, bg: COLORS.secondaryLight },
  cancelled: { label: 'Annulé', color: COLORS.danger, bg: COLORS.dangerLight },
};

export function statusLabel(status: ShipmentStatus): string {
  return STATUS_META[status].label;
}

export function StatusBadge({ status }: { status: ShipmentStatus }) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

// ── RatingStars ──────────────────────────────────────────────────────────

export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const stars = [1, 2, 3, 4, 5].map((i) => {
    let name: 'star' | 'star-half' | 'star-outline' = 'star-outline';
    if (rating >= i) name = 'star';
    else if (rating >= i - 0.5) name = 'star-half';
    return <Ionicons key={i} name={name} size={size} color={COLORS.accent} />;
  });
  return <View style={styles.starsRow}>{stars}</View>;
}

// ── Card ─────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── SectionHeader ────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={36} color={COLORS.textLight} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

// ── Avatar (utility, used across screens) ────────────────────────────────

export function Avatar({
  name,
  size = 44,
  color = COLORS.primary,
}: {
  name?: string;
  size?: number;
  color?: string;
}) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}22`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  badgeDot: { width: 7, height: 7, borderRadius: RADIUS.full },
  badgeText: { fontSize: FONTS.sizes.sm, fontWeight: '600' },

  starsRow: { flexDirection: 'row', gap: 2 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  sectionAction: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.primary },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  emptyMessage: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center' },
});
