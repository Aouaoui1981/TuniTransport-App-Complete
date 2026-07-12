// ──────────────────────────────────────────────────────────────────────────
// THL — UserReviewsScreen
// Avis publics reçus par un utilisateur (transporteur) : note moyenne, nombre
// d'avis, puis liste des avis avec étoiles, tags, commentaire et photos.
// Accessible à tous — permet aux nouveaux utilisateurs de juger avant de
// choisir un transporteur.
// ──────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Card, Avatar, RatingStars, EmptyState } from '../../components';
import { useData } from '../../context/DataContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Review } from '../../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function UserReviewsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'UserReviews'>>();
  const { userId, userName, rating, totalRatings } = route.params;
  const { getUserReviews } = useData();

  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    let active = true;
    getUserReviews(userId)
      .then((list) => {
        if (active) setReviews(list);
      })
      .catch(() => {
        if (active) setReviews([]);
      });
    return () => {
      active = false;
    };
  }, [userId, getUserReviews]);

  const count = totalRatings ?? reviews?.length ?? 0;
  const average =
    rating ??
    (reviews && reviews.length
      ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length
      : 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Summary */}
        <Card style={styles.summary}>
          <Avatar name={userName} size={64} color={COLORS.secondary} />
          <Text style={styles.name}>{userName}</Text>
          <View style={styles.summaryStats}>
            <Ionicons name="star" size={18} color={COLORS.accent} />
            <Text style={styles.average}>{average ? average.toFixed(1) : '—'}</Text>
            <Text style={styles.count}>
              · {count} avis{count > 1 ? '' : ''}
            </Text>
          </View>
        </Card>

        {reviews === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : reviews.length === 0 ? (
          <Card>
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="Aucun avis pour le moment"
              message="Les avis laissés par les expéditeurs apparaîtront ici."
            />
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHead}>
                <Avatar name={review.raterName} size={40} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.raterName}>{review.raterName}</Text>
                  <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                </View>
                <RatingStars rating={review.stars} size={14} />
              </View>

              {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

              {review.tags && review.tags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {review.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {review.photos && review.photos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosRow}
                >
                  {review.photos.map((uri, idx) => (
                    <Image key={`${uri}-${idx}`} source={{ uri }} style={styles.photo} />
                  ))}
                </ScrollView>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxxl },

  summary: { alignItems: 'center', gap: SPACING.xs },
  name: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text, marginTop: SPACING.xs },
  summaryStats: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  average: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  count: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },

  loading: { paddingVertical: SPACING.xxxl, alignItems: 'center' },

  reviewCard: { gap: SPACING.sm },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  raterName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  reviewDate: { fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginTop: 1 },
  comment: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 21 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  tag: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  tagText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: '#B45309' },

  photosRow: { gap: SPACING.sm, paddingTop: SPACING.xs },
  photo: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
  },
});
