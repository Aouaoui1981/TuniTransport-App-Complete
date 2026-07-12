// ──────────────────────────────────────────────────────────────────────────
// THL — WhitePaperScreen (Livre blanc)
// Version in-app du document de référence : accessible sans compte depuis
// l'écran d'inscription, et à tout moment une fois connecté.
// Contenu : content/whitepaper.
// ──────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card } from '../../components';
import { WHITEPAPER, PhaseStatus } from '../../content/whitepaper';

const STATUS_STYLE: Record<PhaseStatus, { label: string; bg: string; fg: string }> = {
  done: { label: 'En production', bg: COLORS.secondaryLight, fg: COLORS.secondaryDark },
  now: { label: 'En cours', bg: COLORS.accentLight, fg: '#B45309' },
  plan: { label: 'Prévu', bg: COLORS.borderLight, fg: COLORS.textSecondary },
};

function StatusChip({ status }: { status: PhaseStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <Text style={[styles.chipText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

function Kicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Paragraph({ children }: { children: string }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function WhitePaperScreen() {
  const wp = WHITEPAPER;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ── Couverture ── */}
        <View style={styles.cover}>
          <Image
            source={require('../../../assets/logo-full.png')}
            style={styles.coverLogo}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>
            THL<Text style={{ color: COLORS.primary }}>.</Text>
          </Text>
          <Text style={styles.docKind}>
            Livre blanc · Version {wp.version} · {wp.date}
          </Text>
          <Text style={styles.headline}>{wp.headline}</Text>
          <Text style={styles.intro}>{wp.intro}</Text>
        </View>

        <View style={styles.statsRow}>
          {wp.stats.map((stat) => (
            <View key={stat.value} style={styles.stat}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── 01 Problème ── */}
        <Card style={styles.section}>
          <Kicker>{wp.problem.kicker}</Kicker>
          <SectionTitle>{wp.problem.title}</SectionTitle>
          {wp.problem.paragraphs.map((p) => (
            <Paragraph key={p.slice(0, 24)}>{p}</Paragraph>
          ))}
          {wp.problem.bullets.map((b) => (
            <Bullet key={b.slice(0, 24)}>{b}</Bullet>
          ))}
          <Paragraph>{wp.problem.closing}</Paragraph>
        </Card>

        {/* ── 02 Solution ── */}
        <Card style={styles.section}>
          <Kicker>{wp.solution.kicker}</Kicker>
          <SectionTitle>{wp.solution.title}</SectionTitle>
          <Text style={styles.subheading}>Pour l'expéditeur</Text>
          {wp.solution.forSender.map((b) => (
            <Bullet key={b.slice(0, 24)}>{b}</Bullet>
          ))}
          <Text style={styles.subheading}>Pour le transporteur</Text>
          {wp.solution.forTransporter.map((b) => (
            <Bullet key={b.slice(0, 24)}>{b}</Bullet>
          ))}
          <View style={styles.callout}>
            <Text style={styles.calloutKicker}>Positionnement juridique</Text>
            <Text style={styles.calloutBody}>{wp.solution.legal}</Text>
          </View>
        </Card>

        {/* ── 03 État du produit ── */}
        <Card style={styles.section}>
          <Kicker>03 · État du produit — en toute transparence</Kicker>
          <SectionTitle>Ce qui existe, ce qui n'existe pas encore</SectionTitle>
          <Paragraph>
            Ce document distingue volontairement ce qui est en production, ce qui est en cours et
            ce qui reste à construire. C'est la condition de la confiance.
          </Paragraph>
          {wp.capabilities.map((cap) => (
            <View key={cap.label} style={styles.capRow}>
              <View style={styles.capHead}>
                <Text style={styles.capLabel}>{cap.label}</Text>
                <StatusChip status={cap.status} />
              </View>
              <Text style={styles.capDetail}>{cap.detail}</Text>
            </View>
          ))}
        </Card>

        {/* ── 04 Modèle économique ── */}
        <Card style={styles.section}>
          <Kicker>{wp.businessModel.kicker}</Kicker>
          <SectionTitle>{wp.businessModel.title}</SectionTitle>
          {wp.businessModel.paragraphs.map((p) => (
            <Paragraph key={p.slice(0, 24)}>{p}</Paragraph>
          ))}
          {wp.businessModel.bullets.map((b) => (
            <Bullet key={b.slice(0, 24)}>{b}</Bullet>
          ))}
        </Card>

        {/* ── 05 Marché ── */}
        <Card style={styles.section}>
          <Kicker>{wp.market.kicker}</Kicker>
          <SectionTitle>{wp.market.title}</SectionTitle>
          {wp.market.circles.map((circle) => (
            <View key={circle.name} style={{ gap: SPACING.xs }}>
              <Text style={styles.subheading}>{circle.name}</Text>
              <Paragraph>{circle.body}</Paragraph>
            </View>
          ))}
          <View style={styles.callout}>
            <Text style={styles.calloutKicker}>Méthode</Text>
            <Text style={styles.calloutBody}>{wp.market.method}</Text>
          </View>
        </Card>

        {/* ── 06 Feuille de route ── */}
        <Card style={styles.section}>
          <Kicker>06 · Feuille de route</Kicker>
          <SectionTitle>Les étapes de l'expansion</SectionTitle>
          {wp.roadmap.map((phase, index) => (
            <View
              key={phase.name}
              style={[styles.phase, index === wp.roadmap.length - 1 && styles.phaseLast]}
            >
              <View
                style={[
                  styles.phaseDot,
                  phase.status === 'done' && { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
                  phase.status === 'now' && { borderColor: COLORS.accent },
                ]}
              />
              <View style={styles.phaseHead}>
                <Text style={styles.phaseName}>{phase.name}</Text>
                <View style={styles.phaseMeta}>
                  <StatusChip status={phase.status} />
                  <Text style={styles.phaseWhen}>{phase.when}</Text>
                </View>
              </View>
              {phase.items.map((item) => (
                <Bullet key={item.slice(0, 24)}>{item}</Bullet>
              ))}
            </View>
          ))}
          <Paragraph>
            Chaque phase est conditionnée à la réussite mesurable de la précédente : pas
            d'extension géographique tant que le corridor France–Tunisie n'a pas prouvé son unité
            économique.
          </Paragraph>
        </Card>

        {/* ── 07 Risques ── */}
        <Card style={styles.section}>
          <Kicker>07 · Risques &amp; réponses</Kicker>
          <SectionTitle>Ce que nous surveillons, et comment</SectionTitle>
          {wp.risks.map((row) => (
            <View key={row.risk} style={styles.riskRow}>
              <Text style={styles.riskName}>{row.risk}</Text>
              <Text style={styles.riskAnswer}>{row.answer}</Text>
            </View>
          ))}
        </Card>

        {/* ── 08 Vision ── */}
        <Card style={styles.section}>
          <Kicker>{wp.vision.kicker}</Kicker>
          <SectionTitle>{wp.vision.title}</SectionTitle>
          {wp.vision.paragraphs.map((p) => (
            <Paragraph key={p.slice(0, 24)}>{p}</Paragraph>
          ))}
        </Card>

        <Text style={styles.disclaimer}>{wp.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xxxl, gap: SPACING.lg },

  cover: { paddingVertical: SPACING.lg, gap: SPACING.sm },
  coverLogo: { width: 132, height: 132, marginBottom: SPACING.xs },
  wordmark: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  docKind: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.primary,
  },
  headline: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.text, lineHeight: 34 },
  intro: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary, lineHeight: 24 },

  statsRow: { flexDirection: 'row', gap: SPACING.md },
  stat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    gap: 2,
  },
  statValue: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primaryDark },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, lineHeight: 14 },

  section: { gap: SPACING.md },
  kicker: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: -SPACING.xs,
  },
  subheading: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  paragraph: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 22 },

  bulletRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 8 },
  bulletText: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 22 },

  callout: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  calloutKicker: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.primaryDark,
  },
  calloutBody: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 21 },

  chip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: FONTS.sizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  capRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  capHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  capLabel: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  capDetail: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },

  phase: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    paddingLeft: SPACING.lg,
    paddingBottom: SPACING.lg,
    marginLeft: 6,
    gap: SPACING.sm,
  },
  phaseLast: { paddingBottom: 0 },
  phaseDot: {
    position: 'absolute',
    left: -8,
    top: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  phaseHead: { gap: SPACING.xs },
  phaseName: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.text },
  phaseMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  phaseWhen: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textLight },

  riskRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  riskName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  riskAnswer: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },

  disclaimer: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
});
