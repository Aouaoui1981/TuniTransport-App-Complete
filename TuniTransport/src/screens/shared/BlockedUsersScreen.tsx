// ──────────────────────────────────────────────────────────────────────────
// THL — Membres bloqués
// Liste des personnes que l'utilisateur a bloquées, avec déblocage.
//
// Le nom vient des conversations : depuis le durcissement de la RLS, un
// membre ne peut plus lire le profil d'un autre. `conversation_participants`
// porte en revanche le nom affiché, et c'est bien là qu'on a rencontré la
// personne. Faute de conversation retrouvée, on affiche un libellé neutre
// plutôt que de laisser une ligne vide.
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { Avatar, Card, EmptyState } from '../../components';
import { useData } from '../../context/DataContext';

export default function BlockedUsersScreen() {
  const { blockedUserIds, conversations, unblockUser } = useData();

  const blocked = useMemo(
    () =>
      blockedUserIds.map((id) => {
        const conv = conversations.find((c) => c.participantNames[id]);
        return { id, name: conv?.participantNames[id] || 'Membre bloqué' };
      }),
    [blockedUserIds, conversations]
  );

  const confirmUnblock = (id: string, name: string) => {
    showAlert('Débloquer', `Autoriser à nouveau les messages avec ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Débloquer',
        onPress: () => {
          unblockUser(id).catch(() =>
            showAlert('Déblocage', 'Opération impossible pour le moment. Réessayez.')
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {blocked.length === 0 ? (
          <EmptyState
            icon="ban-outline"
            title="Aucun membre bloqué"
            message="Vous pouvez bloquer un membre depuis votre conversation avec lui. Il ne pourra plus vous écrire."
          />
        ) : (
          <>
            <Text style={styles.intro}>
              Ces membres ne peuvent plus vous écrire, et vous ne pouvez plus leur écrire. Vos
              conversations avec eux sont masquées.
            </Text>
            {blocked.map((b) => (
              <Card key={b.id} style={styles.row}>
                <Avatar name={b.name} size={42} color={COLORS.textSecondary} />
                <Text style={styles.name} numberOfLines={1}>
                  {b.name}
                </Text>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => confirmUnblock(b.id, b.name)}
                  accessibilityLabel={`Débloquer ${b.name}`}
                >
                  <Text style={styles.btnText}>Débloquer</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  intro: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  name: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  btn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  btnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
});
