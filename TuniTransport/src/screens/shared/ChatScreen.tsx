// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Chat — STEP 10
// Mine = blue right; other = white left. Demo mode auto-replies ~2s later.
// ──────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, FONTS } from '../../utils/theme';
import { Avatar } from '../../components';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { IS_LIVE } from '../../services/supabase';
import { fetchProfile } from '../../services/api';
import { MOCK_USERS } from '../../services/mockData';
import { Message } from '../../types';

const DEMO_REPLIES = [
  'Parfait, je vous tiens au courant !',
  'Bien reçu, merci pour votre message.',
  'Pas de souci, on reste en contact.',
  'Très bien, je m’en occupe.',
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { user } = useAuth();
  const { getConversationById, getMessagesByConversation, addMessage } = useData();

  const conversation = getConversationById(route.params.conversationId);
  const messages = getMessagesByConversation(route.params.conversationId);

  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const otherId = useMemo(
    () => conversation?.participants.find((p) => p !== user?.id),
    [conversation, user?.id]
  );
  const otherName = (otherId && conversation?.participantNames[otherId]) || 'Contact';

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  useEffect(() => {
    // Keep the view pinned to the latest message.
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  const callOther = async () => {
    try {
      let phone: string | undefined;
      if (!otherId) {
        phone = undefined;
      } else if (IS_LIVE) {
        phone = (await fetchProfile(otherId))?.phone;
      } else {
        phone = MOCK_USERS.find((u) => u.id === otherId)?.phone;
      }
      if (phone) {
        await Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
      } else {
        Alert.alert('Appel', 'Le numéro de ce contact n’est pas disponible.');
      }
    } catch {
      Alert.alert('Appel', 'Impossible de lancer l’appel sur cet appareil.');
    }
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !conversation) return;
    setText('');
    await addMessage({
      conversationId: conversation.id,
      senderId: user.id,
      text: trimmed,
    });

    if (!isMounted.current) return;

    // Demo mode: simulate the other participant answering ~2s later.
    if (!IS_LIVE && otherId) {
      if (replyTimer.current) clearTimeout(replyTimer.current);
      replyTimer.current = setTimeout(() => {
        if (!isMounted.current) return;
        const reply = DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)];
        addMessage({ conversationId: conversation.id, senderId: otherId, text: reply });
      }, 2000);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = item.senderId === user?.id;
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, mine && { color: COLORS.white }]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeOther]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Avatar name={otherName} size={38} color={COLORS.secondary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName}
          </Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>En ligne</Text>
          </View>
        </View>
        <TouchableOpacity onPress={callOther} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="call-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Pièces jointes', 'L’envoi de pièces jointes sera bientôt disponible.')
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add-circle-outline" size={26} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Écrivez votre message…"
            placeholderTextColor={COLORS.textLight}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
            onPress={send}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerName: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  onlineText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  list: { padding: SPACING.lg, gap: SPACING.sm, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: RADIUS.sm },
  bubbleOther: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  bubbleText: { fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 20 },
  bubbleTime: { fontSize: FONTS.sizes.xs, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: '#DBEAFEDD' },
  bubbleTimeOther: { color: COLORS.textLight },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
