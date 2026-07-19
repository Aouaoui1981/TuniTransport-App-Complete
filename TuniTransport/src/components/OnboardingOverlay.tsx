// ──────────────────────────────────────────────────────────────────────────
// THL — Tutoriel de première utilisation (affiché une seule fois).
// Auto-géré : lit/écrit un indicateur AsyncStorage. Rendu par WelcomeScreen.
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { SPACING, RADIUS, FONTS, DARK } from '../utils/theme';

const KEY = 'thl_intro_seen_v1';

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'boat-outline',
    title: 'Bienvenue sur THL',
    text: "Envoyez vos colis entre la France et la Tunisie via des transporteurs voyageant en ferry — en toute confiance.",
  },
  {
    icon: 'cube-outline',
    title: 'Expédiez facilement',
    text: "Publiez votre colis : les transporteurs vérifiés vous font des offres. Colis légers à prix fixe, objets volumineux aux enchères.",
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Sécurité & suivi',
    text: "Identités vérifiées, paiement en ligne sécurisé, suivi en temps réel, et messagerie intégrée du dépôt à la livraison.",
  },
  {
    icon: 'flag-outline',
    title: 'En cas de souci',
    text: "Un problème sur un envoi ? Signalez-le en un clic : notre équipe examine et vous aide à trouver une solution.",
  },
];

export default function OnboardingOverlay() {
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!v) setVisible(true);
      })
      .catch(() => undefined);
  }, []);

  const finish = () => {
    AsyncStorage.setItem(KEY, '1').catch(() => undefined);
    setVisible(false);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={finish}>
      <View style={styles.root}>
        <LinearGradient
          colors={['#0F3B3A', '#0E2233', '#0A1420', '#050B12']}
          locations={[0, 0.32, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.skip}>Passer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            style={{ flex: 1 }}
          >
            {SLIDES.map((s) => (
              <View key={s.title} style={[styles.slide, { width }]}>
                <View style={styles.iconWrap}>
                  <Ionicons name={s.icon} size={56} color={DARK.colors.secondary} />
                </View>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.text}>{s.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={next} activeOpacity={0.85}>
              <LinearGradient
                colors={DARK.gradients.cta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>{isLast ? 'Commencer' : 'Suivant'}</Text>
                <Ionicons name="arrow-forward" size={18} color={DARK.colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.colors.bgBase },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', padding: SPACING.xl },
  skip: { color: DARK.colors.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: DARK.colors.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  text: {
    fontSize: FONTS.sizes.lg,
    lineHeight: 26,
    color: DARK.colors.textSecondary,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: SPACING.lg },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { backgroundColor: DARK.colors.secondary, width: 22 },
  footer: { paddingHorizontal: SPACING.xxl, paddingBottom: SPACING.xl },
  cta: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: DARK.colors.white, fontWeight: '700', fontSize: FONTS.sizes.lg },
});
