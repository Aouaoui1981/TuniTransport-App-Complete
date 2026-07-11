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
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const CACHE_KEY_SHIPMENTS = 'TT_CACHE_SHIPMENTS';
const CACHE_KEY_CONVERSATIONS = 'TT_CACHE_CONVERSATIONS';
const CACHE_KEY_MESSAGES = 'TT_CACHE_MESSAGES';
const CACHE_KEY_ROUTES = 'TT_CACHE_ROUTES';

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
  acceptSmallShipment: (shipmentId: string) => Promise<void>;
  payByCash: (shipmentId: string) => Promise<void>;
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
  const isMounted = useRef(true);
  const [isReady, setIsReady] = useState(false);

  // ── Initial load / reload on auth change ───────────────────────────────

  const loadAll = useCallback(async () => {
    if (IS_LIVE) {
      if (!user) {
        setShipments([]);
        setConversations([]);
        setMessages([]);
        setRoutes([]);
        await Promise.all([
          AsyncStorage.removeItem(CACHE_KEY_SHIPMENTS),
          AsyncStorage.removeItem(CACHE_KEY_CONVERSATIONS),
          AsyncStorage.removeItem(CACHE_KEY_MESSAGES),
          AsyncStorage.removeItem(CACHE_KEY_ROUTES),
        ]).catch(() => {});
        return;
      }
      try {
        const [sh, rt, convData] = await Promise.all([
          api.fetchShipments(user.id, user.role).catch(() => [] as Shipment[]),
          api.fetchRoutes().catch(() => [] as Route[]),
          api.fetchConversations(user.id).catch(() => ({ conversations: [], messages: [] })),
        ]);
        if (!isMounted.current) return;

        const { conversations: cv, messages: ms } = 'conversations' in convData
          ? convData
          : { conversations: convData as unknown as Conversation[], messages: [] };

        setShipments(sh);
        setRoutes(rt);
        setConversations(cv);
        setMessages(ms);
      } catch (e) {
        console.error('loadAll error:', e);
      }
    } else {
      setShipments(MOCK_SHIPMENTS.map((s) => ({ ...s })));
      setConversations(MOCK_CONVERSATIONS.map((c) => ({ ...c })));
      setMessages(MOCK_MESSAGES.map((m) => ({ ...m })));
      setRoutes(MOCK_ROUTES.map((r) => ({ ...r })));
    }
  }, [user]);

  useEffect(() => {
    isMounted.current = true;
    const rehydrate = async () => {
      try {
        const [s, c, m, r] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEY_SHIPMENTS),
          AsyncStorage.getItem(CACHE_KEY_CONVERSATIONS),
          AsyncStorage.getItem(CACHE_KEY_MESSAGES),
          AsyncStorage.getItem(CACHE_KEY_ROUTES),
        ]);
        if (!isMounted.current) return;
        if (s) setShipments(JSON.parse(s));
        if (c) setConversations(JSON.parse(c));
        if (m) setMessages(JSON.parse(m));
        if (r) setRoutes(JSON.parse(r));
      } catch (e) {
        console.warn('DataContext rehydration error:', e);
      }
    };
    rehydrate().then(() => {
      if (isMounted.current) {
        setIsReady(true);
        loadAll();
      }
    });
    return () => {
      isMounted.current = false;
    };
  }, [isAuthenticated, loadAll]);

  // ── Sync to cache on changes ───────────────────────────────────────────

  useEffect(() => {
    if (IS_LIVE && user && isReady) {
      AsyncStorage.setItem(CACHE_KEY_SHIPMENTS, JSON.stringify(shipments)).catch(() => {});
    }
  }, [shipments, user, isReady]);

  useEffect(() => {
    if (IS_LIVE && user && isReady) {
      AsyncStorage.setItem(CACHE_KEY_CONVERSATIONS, JSON.stringify(conversations)).catch(() => {});
    }
  }, [conversations, user, isReady]);

  useEffect(() => {
    if (IS_LIVE && user && isReady) {
      AsyncStorage.setItem(CACHE_KEY_MESSAGES, JSON.stringify(messages)).catch(() => {});
    }
  }, [messages, user, isReady]);

  useEffect(() => {
    if (IS_LIVE && user && isReady) {
      AsyncStorage.setItem(CACHE_KEY_ROUTES, JSON.stringify(routes)).catch(() => {});
    }
  }, [routes, user, isReady]);

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
        if (isMounted.current) {
          setShipments((prev) => [created, ...prev]);
        }
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
        if (isMounted.current) {
          setShipments(snapshot);
        }
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
          if (isMounted.current) {
            setShipments((prev) =>
              prev.map((s) =>
                s.id === input.shipmentId
                  ? { ...s, bids: (s.bids ?? []).map((b) => (b.id === local.id ? created : b)) }
                  : s
              )
            );
          }
        } catch (e) {
          // Remove the phantom optimistic bid so the UI matches the server.
          if (isMounted.current) {
            setShipments((prev) =>
              prev.map((s) =>
                s.id === input.shipmentId
                  ? { ...s, bids: (s.bids ?? []).filter((b) => b.id !== local.id) }
                  : s
              )
            );
          }
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
        if (isMounted.current) {
          setShipments(snapshot);
        }
        throw e;
      }
    }
  }, []);

  // ── acceptSmallShipment (direct take-over, no auction) ──────────────────
  // Assignment columns are locked client-side by the shipments guard
  // trigger, so live mode goes through the accept_small_shipment RPC.

  const acceptSmallShipment = useCallback(
    async (shipmentId: string) => {
      if (!user) throw new Error('Non connecté.');
      const transporterName = `${user.firstName} ${user.lastName}`.trim();
      let snapshot: Shipment[] = [];
      setShipments((prev) => {
        snapshot = prev;
        return prev.map((s) => {
          if (s.id !== shipmentId) return s;
          const event: TrackingEvent = {
            id: uid('te'),
            status: 'accepted',
            description: `Envoi accepté par ${transporterName}`,
            location: s.pickupAddress.city,
            timestamp: new Date().toISOString(),
          };
          return {
            ...s,
            status: 'accepted',
            transporterId: user.id,
            transporterName,
            transporterTermsAcceptedAt: new Date().toISOString(),
            trackingHistory: [...s.trackingHistory, event],
          };
        });
      });
      if (IS_LIVE) {
        try {
          await api.acceptSmallShipment(shipmentId);
        } catch (e) {
          if (isMounted.current) {
            setShipments(snapshot);
          }
          throw e;
        }
      }
    },
    [user]
  );

  // ── payByCash (règlement en espèces à la remise) ────────────────────────
  // paid_at est verrouillé côté client : le mode live passe par le RPC
  // choose_cash_payment ; le mode démo simule localement.

  const payByCash = useCallback(async (shipmentId: string) => {
    const now = new Date().toISOString();
    let snapshot: Shipment[] = [];
    setShipments((prev) => {
      snapshot = prev;
      return prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const event: TrackingEvent = {
          id: uid('te'),
          status: s.status,
          description:
            'Paiement en espèces convenu — à régler au transporteur à la remise du colis. Réservation validée.',
          timestamp: now,
        };
        return {
          ...s,
          paidAt: now,
          paymentMethod: 'cash' as const,
          trackingHistory: [...s.trackingHistory, event],
        };
      });
    });
    if (IS_LIVE) {
      try {
        await api.chooseCashPayment(shipmentId);
      } catch (e) {
        if (isMounted.current) {
          setShipments(snapshot);
        }
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
        if (isMounted.current) {
          setMessages((prev) => prev.map((m) => (m.id === local.id ? created : m)));
        }
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
        if (isMounted.current) {
          setConversations((prev) => [created, ...prev]);
        }
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
          if (isMounted.current) {
            setRoutes((prev) => prev.map((r) => (r.id === local.id ? created : r)));
          }
        } catch (e) {
          if (isMounted.current) {
            setRoutes((prev) => prev.filter((r) => r.id !== local.id));
          }
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
      acceptSmallShipment,
      payByCash,
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
      acceptSmallShipment,
      payByCash,
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
