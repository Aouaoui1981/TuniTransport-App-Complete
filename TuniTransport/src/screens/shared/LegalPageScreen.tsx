// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — LegalPageScreen
// Rendu générique des six pages légales/informatives (contenu : content/legal).
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card } from '../../components';
import { LEGAL_PAGES } from '../../content/legal';
import { RootStackParamList } from '../../navigation/AppNavigator';

export default function LegalPageScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Legal'>>();
  const page = LEGAL_PAGES[route.params.page];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name={page.icon} size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.intro}>{page.intro}</Text>
        </View>

        {page.sections.map((section, idx) => (
          <Card key={idx} style={styles.section}>
            {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
            {section.body ? <Text style={styles.body}>{section.body}</Text> : null}
            {section.bullets?.map((bullet, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </Card>
        ))}

        <Text style={styles.updated}>Dernière mise à jour : {page.updatedAt}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  hero: { alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.xs },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  section: { gap: SPACING.sm },
  heading: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  body: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 7,
  },
  bulletText: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 21 },
  updated: {
    textAlign: 'center',
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
});
