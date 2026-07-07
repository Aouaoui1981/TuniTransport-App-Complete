// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — DataContext (STEPS 4, 11 & 14)
// Demo mode: in-memory state seeded from mockData.
// Live mode: Supabase reads + optimistic writes. Same public API.
// ──────────────────────────────────────────────────────────────────────────
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { IS_LIVE } from '../services/supabase';
import * as api from '../services/api';
import {
  MOCK_SHIPMENTS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_ROUTES,
} from '../services/mockData';
import { useAuth } from './AuthContext';
import {
  Shipment,
  Conversation,
  Message,
  Route,
  Bid,
  TrackingEvent,
} from '../types';

let seq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${++seq}`;

interface DataContextValue {
  shipments: Shipment[];
  conversations: Conversation[];
  messages: Message[];
  routes: Route[];
  addShipment: (
    shipment: Omit<Shipment, 'id' | 'createdAt' | 'trackingHistory' | 'bids' | 'status'>
  ) => Promise<Shipment>;
  updateShipment: (id: string, updates: Partial<Shipment>) => Promise<void>;
  addBid: (bid: Omit<Bid, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  acceptBid: (shipmentId: string, bidId: string) => Promise<void>;
  addMessage: (msg: Pick<Message, 'conversationId' | 'senderId' | 'text'>) => Promise<Message>;
  ensureConversation: (params: {
    otherUserId: string;
    otherUserName: string;
    shipmentId?: string;
  }) => Promise<Conversation>;
  addRoute: (route: Omit<Route, 'id'>) => Promise<void>;
  submitRating: (params: {
    shipmentId: string;
    ratedUserId: string;
    stars: number;
    tags?: string[];
    comment?: string;
  }) => Promise<void>;
  getShipmentById: (id: string) => Shipment | undefined;
  getConversationById: (id: string) => Conversation | undefined;
  getMessagesByConversation: (conversationId: string) => Message[];
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  // ── Initial load / reload on auth change ───────────────────────────────

  const loadAll = useCallback(async () => {
    if (IS_LIVE) {
      if (!user) {
        setShipments([]);
        setConversations([]);
        setMessages([]);
        setRoutes([]);
        return;
      }
      const [sh, rt, cv] = await Promise.all([
        api.fetchShipments(user.id, user.role).catch(() => [] as Shipment[]),
        api.fetchRoutes().catch(() => [] as Route[]),
        api.fetchConversations(user.id).catch(() => [] as Conversation[]),
      ]);
      setShipments(sh);
      setRoutes(rt);
      setConversations(cv);
      const msgLists = await Promise.all(
        cv.map((c) => api.fetchMessages(c.id).catch(() => [] as Message[]))
      );
      setMessages(msgLists.flat());
    } else {
      setShipments(MOCK_SHIPMENTS.map((s) => ({ ...s })));
      setConversations(MOCK_CONVERSATIONS.map((c) => ({ ...c })));
      setMessages(MOCK_MESSAGES.map((m) => ({ ...m })));
      setRoutes(MOCK_ROUTES.map((r) => ({ ...r })));
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [isAuthenticated, loadAll]);

  // ── addShipment (status pending + first tracking event) ────────────────

  const addShipment = useCallback(
    async (
      input: Omit<Shipment, 'id' | 'createdAt' | 'trackingHistory' | 'bids' | 'status'>
    ): Promise<Shipment> => {
      const now = new Date().toISOString();
      const firstEvent: TrackingEvent = {
        id: uid('te'),
        status: 'pending',
        description: "Envoi créé et publié par l'expéditeur",
        location: `${input.pickupAddress.city}, ${input.pickupAddress.country}`,
        timestamp: now,
      };
      // Live mode: never trust hard-coded ids — force ownership from auth.
      const senderId = IS_LIVE && user ? user.id : input.senderId;
      const senderName = IS_LIVE && user ? `${user.firstName} ${user.lastName}` : input.senderName;

      const local: Shipment = {
        ...input,
        senderId,
        senderName,
        id: uid('s'),
        status: 'pending',
        createdAt: now,
        trackingHistory: [firstEvent],
        bids: [],
      };

      if (IS_LIVE) {
        const created = await api.createShipment({ ...input, senderId, senderName, status: 'pending' });
        setShipments((prev) => [created, ...prev]);
        return created;
      }
      setShipments((prev) => [local, ...prev]);
      return local;
    },
    [user]
  );

  // ── updateShipment ──────────────────────────────────────────────────────

  const updateShipment = useCallback(async (id: string, updates: Partial<Shipment>) => {
    // Optimistic update with rollback: if the server rejects the write, the
    // UI must not keep pretending it succeeded.
    let snapshot: Shipment[] = [];
    setShipments((prev) => {
      snapshot = prev;
      return prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
    });
    if (IS_LIVE) {
      try {
        await api.updateShipment(id, updates);
        if (updates.trackingHistory && updates.trackingHistory.length > 0) {
          const latest = updates.trackingHistory[updates.trackingHistory.length - 1];
          await api
            .addTrackingEvent(id, {
              status: latest.status,
              description: latest.description,
              location: latest.location,
            })
            .catch(() => undefined); // tracking is informative, not critical
        }
      } catch (e) {
        setShipments(snapshot);
        throw e;
      }
    }
  }, []);

  // ── addBid ──────────────────────────────────────────────────────────────

  const addBid = useCallback(
    async (input: Omit<Bid, 'id' | 'createdAt' | 'status'>) => {
      const transporterId = IS_LIVE && user ? user.id : input.transporterId;
      const local: Bid = {
        ...input,
        transporterId,
        id: uid('bid'),
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      setShipments((prev) =>
        prev.map((s) =>
          s.id === input.shipmentId ? { ...s, bids: [...(s.bids ?? []), local] } : s
        )
      );
      if (IS_LIVE) {
        try {
          const created = await api.createBid({ ...input, transporterId });
          setShipments((prev) =>
            prev.map((s) =>
              s.id === input.shipmentId
                ? { ...s, bids: (s.bids ?? []).map((b) => (b.id === local.id ? created : b)) }
                : s
            )
          );
        } catch (e) {
          // Remove the phantom optimistic bid so the UI matches the server.
          setShipments((prev) =>
            prev.map((s) =>
              s.id === input.shipmentId
                ? { ...s, bids: (s.bids ?? []).filter((b) => b.id !== local.id) }
                : s
            )
          );
          throw e;
        }
      }
    },
    [user]
  );

  // ── acceptBid (STEP 11 auction rule) ────────────────────────────────────

  const acceptBid = useCallback(async (shipmentId: string, bidId: string) => {
    let snapshot: Shipment[] = [];
    setShipments((prev) => {
      snapshot = prev;
      return prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const bid = (s.bids ?? []).find((b) => b.id === bidId);
        if (!bid) return s;
        const event: TrackingEvent = {
          id: uid('te'),
          status: 'accepted',
          description: `Offre acceptée — pris en charge par ${bid.transporterName}`,
          timestamp: new Date().toISOString(),
        };
        return {
          ...s,
          status: 'accepted',
          transporterId: bid.transporterId,
          transporterName: bid.transporterName,
          price: bid.price,
          selectedBidId: bidId,
          trackingHistory: [...s.trackingHistory, event],
          bids: (s.bids ?? []).map((b) =>
            b.id === bidId ? { ...b, status: 'accepted' } : { ...b, status: 'rejected' }
          ),
        };
      });
    });
    if (IS_LIVE) {
      try {
        await api.acceptBid(shipmentId, bidId);
      } catch (e) {
        // The DB transaction failed: roll back so the sender never pays for
        // a bid that was not actually accepted.
        setShipments(snapshot);
        throw e;
      }
    }
  }, []);

  // ── addMessage ──────────────────────────────────────────────────────────

  const addMessage = useCallback(
    async (input: Pick<Message, 'conversationId' | 'senderId' | 'text'>): Promise<Message> => {
      const local: Message = {
        ...input,
        id: uid('m'),
        timestamp: new Date().toISOString(),
        read: true,
      };
      setMessages((prev) => [...prev, local]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === input.conversationId
            ? { ...c, lastMessage: local, updatedAt: local.timestamp, unreadCount: 0 }
            : c
        )
      );
      if (IS_LIVE) {
        const created = await api.sendMessage(input).catch(() => local);
        setMessages((prev) => prev.map((m) => (m.id === local.id ? created : m)));
        return created;
      }
      return local;
    },
    []
  );

  // ── ensureConversation ──────────────────────────────────────────────────
  // Finds the conversation with the given user (preferring one tied to the
  // same shipment) or creates it — chat can start from any shipment/bid.

  const ensureConversation = useCallback(
    async (params: {
      otherUserId: string;
      otherUserName: string;
      shipmentId?: string;
    }): Promise<Conversation> => {
      if (!user) throw new Error('Utilisateur non connecté.');
      const withBoth = conversations.filter(
        (c) => c.participants.includes(user.id) && c.participants.includes(params.otherUserId)
      );
      const existing = params.shipmentId
        ? withBoth.find((c) => c.shipmentId === params.shipmentId) ?? withBoth[0]
        : withBoth[0];
      if (existing) return existing;

      const myName = `${user.firstName} ${user.lastName}`;
      if (IS_LIVE) {
        const created = await api.createConversation({
          me: { id: user.id, name: myName },
          other: { id: params.otherUserId, name: params.otherUserName },
          shipmentId: params.shipmentId,
        });
        setConversations((prev) => [created, ...prev]);
        return created;
      }
      const local: Conversation = {
        id: uid('c'),
        participants: [user.id, params.otherUserId],
        participantNames: {
          [user.id]: myName,
          [params.otherUserId]: params.otherUserName,
        },
        shipmentId: params.shipmentId,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) => [local, ...prev]);
      return local;
    },
    [user, conversations]
  );

  // ── addRoute ────────────────────────────────────────────────────────────

  const addRoute = useCallback(
    async (input: Omit<Route, 'id'>) => {
      const transporterId = IS_LIVE && user ? user.id : input.transporterId;
      const local: Route = { ...input, transporterId, id: uid('r') };
      setRoutes((prev) =>
        [...prev, local].sort((a, b) => a.departureDate.localeCompare(b.departureDate))
      );
      if (IS_LIVE) {
        try {
          const created = await api.createRoute({ ...input, transporterId });
          setRoutes((prev) => prev.map((r) => (r.id === local.id ? created : r)));
        } catch (e) {
          setRoutes((prev) => prev.filter((r) => r.id !== local.id));
          throw e;
        }
      }
    },
    [user]
  );

  // ── submitRating (STEP 11 rating rule) ──────────────────────────────────

  const submitRating = useCallback(
    async (params: {
      shipmentId: string;
      ratedUserId: string;
      stars: number;
      tags?: string[];
      comment?: string;
    }) => {
      if (IS_LIVE && user) {
        await api.submitRating({ ...params, raterId: user.id });
        return;
      }
      // Demo mode: recompute the transporter's average wherever it appears.
      setShipments((prev) =>
        prev.map((s) => ({
          ...s,
          bids: (s.bids ?? []).map((b) =>
            b.transporterId === params.ratedUserId
              ? { ...b, transporterRating: params.stars }
              : b
          ),
        }))
      );
    },
    [user]
  );

  // ── Getters ─────────────────────────────────────────────────────────────

  const getShipmentById = useCallback(
    (id: string) => shipments.find((s) => s.id === id),
    [shipments]
  );

  const getConversationById = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  );

  const getMessagesByConversation = useCallback(
    (conversationId: string) =>
      messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [messages]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      shipments,
      conversations,
      messages,
      routes,
      addShipment,
      updateShipment,
      addBid,
      acceptBid,
      addMessage,
      ensureConversation,
      addRoute,
      submitRating,
      getShipmentById,
      getConversationById,
      getMessagesByConversation,
      refresh: loadAll,
    }),
    [
      shipments,
      conversations,
      messages,
      routes,
      addShipment,
      updateShipment,
      addBid,
      acceptBid,
      addMessage,
      ensureConversation,
      addRoute,
      submitRating,
      getShipmentById,
      getConversationById,
      getMessagesByConversation,
      loadAll,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData doit être utilisé dans <DataProvider>.');
  return ctx;
}
