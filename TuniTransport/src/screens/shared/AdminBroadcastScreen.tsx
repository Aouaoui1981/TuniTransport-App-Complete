// ──────────────────────────────────────────────────────────────────────────
// THL — Annonces (écran administrateur)
// Diffuse une annonce à tous les utilisateurs (visible dans leurs
// notifications). Autorisation appliquée côté serveur (RPC is_admin).
// ──────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { showAlert } from '../../utils/alert';
import { getErrorMessage } from '../../utils/errors';
import { Card, EmptyState } from '../../components';
import { IS_LIVE } from '../../services/supabase';
import { fetchAnnouncements, createAnnouncement } from '../../services/api';
import { Announcement } from '../../types';

export default function AdminBroadcastScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<Announcement[]>([]);

  const load = useCallback(async () => {
    if (!IS_LIVE) return;
    try {
      setItems(await fetchAnnouncements());
    } catch {
      // liste best-effort
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!title.trim() || !body.trim()) {
      showAlert('Champs requis', 'Veuillez saisir un titre et un message.');
      return;
    }
    setSending(true);
    try {
      await createAnnouncement(title.trim(), body.trim());
      setTitle('');
      setBody('');
      showAlert('Annonce envoyée', 'Tous les utilisateurs verront cette annonce dans leurs notifications.');
      load();
    } catch (e) {
      showAlert('Envoi impossible', getErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.composer}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex. Nouvelle fonctionnalité"
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Votre message à tous les utilisateurs…"
              placeholderTextColor={COLORS.textLight}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, sending && { opacity: 0.6 }]}
              onPress={send}
              disabled={sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="megaphone-outline" size={18} color={COLORS.white} />
                  <Text style={styles.sendText}>Diffuser à tous</Text>
                </>
              )}
            </TouchableOpacity>
          </Card>

          <Text style={styles.sectionTitle}>Annonces précédentes</Text>
          {items.length === 0 ? (
            <EmptyState icon="megaphone-outline" title="Aucune annonce" message="Vos annonces apparaîtront ici." />
          ) : (
            items.map((a) => (
              <Card key={a.id} style={styles.item}>
                <Text style={styles.itemTitle}>{a.title}</Text>
                <Text style={styles.itemBody}>{a.body}</Text>
                <Text style={styles.itemDate}>
                  {new Date(a.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </Card>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxxl },

  composer: { marginBottom: SPACING.lg },
  label: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  sendText: { color: COLORS.white, fontWeight: '700', fontSize: FONTS.sizes.md },

  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  item: { marginBottom: SPACING.md },
  itemTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  itemBody: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  itemDate: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: SPACING.xs },
});
