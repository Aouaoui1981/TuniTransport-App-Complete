import { Platform } from 'react-native';
// SDK 54 moved readAsStringAsync behind the /legacy entry point — importing
// it from the package root throws a deprecation error at runtime.
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// ──────────────────────────────────────────────────────────────────────────
// TuniTransport -- Supabase data access (STEP 5)
// Every function assumes IS_LIVE === true (callers guard with IS_LIVE).
// ──────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';
import {
  User,
  Shipment,
  Bid,
  Route,
  Conversation,
  Message,
  TrackingEvent,
  UserRole,
  ShipmentLocation,
  TruckDetails,
  ShipmentStatus,
  BidStatus,
  ShipmentType,
  Address,
  Item,
  IdentityStatus,
  Review,
  PayoutAccount,
  PayoutRequest,
  PayoutRequestAdmin,
  PayoutStatus,
  AdminStats,
  AdminUser,
  AdminShipment,
  AdminReview,
  Announcement,
  Dispute,
  DisputeCategory,
  DisputeStatus,
  AdminDispute,
  ReferralSummary,
  ReferralItem,
  ReferralItemStatus,
  AdminShipmentDetail,
} from '../types';

function db() {
  if (!supabase) throw new Error('Supabase non configuré (mode démo).');
  return supabase;
}

// ── Row types ────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  avatar_url?: string;
  rating?: number;
  total_ratings?: number;
  created_at: string;
  truck_details?: TruckDetails;
  identity_status?: string;
  identity_document_type?: string;
  identity_rejection_reason?: string;
  is_admin?: boolean;
  suspended?: boolean;
  onboarded?: boolean;
}

interface TrackingEventRow {
  id: string;
  status: ShipmentStatus;
  description: string;
  location?: string;
  created_at: string;
}

interface BidRow {
  id: string;
  transporter_id: string;
  transporter_name?: string;
  transporter_rating?: number;
  shipment_id: string;
  price: number;
  estimated_delivery: string;
  message?: string;
  created_at: string;
  status: BidStatus;
  terms_accepted_at?: string;
}

interface ShipmentRow {
  id: string;
  sender_id: string;
  sender_name?: string;
  transporter_id?: string;
  transporter_name?: string;
  type: ShipmentType;
  status: ShipmentStatus;
  weight?: number;
  price?: number;
  items?: Item[];
  description?: string;
  photos?: string[];
  dimensions?: string;
  pickup_address: Address;
  delivery_address: Address;
  created_at: string;
  collected_at?: string;
  delivered_at?: string;
  paid_at?: string;
  payment_method?: 'card' | 'cash';
  selected_bid_id?: string;
  tracking_events?: TrackingEventRow[];
  bids?: BidRow[];
  terms_accepted_at?: string;
  non_commercial_declared_at?: string;
  transporter_terms_accepted_at?: string;
}

interface RouteRow {
  id: string;
  transporter_id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  estimated_arrival_date: string;
  available_capacity: number;
  ferry_company: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read?: boolean;
}

interface ConversationParticipantRow {
  user_id: string;
  display_name: string;
}

interface ConversationRow {
  id: string;
  shipment_id?: string;
  updated_at: string;
  created_at: string;
  conversation_participants?: ConversationParticipantRow[];
  messages?: MessageRow[];
}

interface ShipmentLocationRow {
  id: string;
  shipment_id: string;
  transporter_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  recorded_at: string;
}

// ── Mappers (snake_case → camelCase) ─────────────────────────────────────

export function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email ?? '',
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    phone: row.phone ?? '',
    role: row.role as UserRole,
    avatar: row.avatar_url ?? undefined,
    rating: Number(row.rating ?? 0),
    totalRatings: row.total_ratings ?? 0,
    createdAt: row.created_at,
    truckDetails: row.truck_details ?? undefined,
    identityStatus: (row.identity_status as IdentityStatus) ?? 'unsubmitted',
    identityDocumentType: row.identity_document_type ?? undefined,
    identityRejectionReason: row.identity_rejection_reason ?? undefined,
    isAdmin: row.is_admin ?? false,
    suspended: row.suspended ?? false,
    onboarded: row.onboarded ?? true,
  };
}

function mapTrackingEvent(row: TrackingEventRow): TrackingEvent {
  return {
    id: row.id,
    status: row.status,
    description: row.description,
    location: row.location ?? undefined,
    timestamp: row.created_at,
  };
}

function mapBid(row: BidRow): Bid {
  return {
    id: row.id,
    transporterId: row.transporter_id,
    transporterName: row.transporter_name ?? '',
    transporterRating: Number(row.transporter_rating ?? 0),
    shipmentId: row.shipment_id,
    price: Number(row.price),
    estimatedDelivery: row.estimated_delivery,
    message: row.message ?? undefined,
    createdAt: row.created_at,
    status: row.status,
    termsAcceptedAt: row.terms_accepted_at ?? undefined,
  };
}

function mapShipment(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name ?? '',
    transporterId: row.transporter_id ?? undefined,
    transporterName: row.transporter_name ?? undefined,
    type: row.type,
    status: row.status,
    weight: row.weight != null ? Number(row.weight) : undefined,
    price: row.price != null ? Number(row.price) : undefined,
    items: row.items ?? undefined,
    description: row.description ?? undefined,
    photos: row.photos ?? undefined,
    dimensions: row.dimensions ?? undefined,
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    createdAt: row.created_at,
    collectedAt: row.collected_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    selectedBidId: row.selected_bid_id ?? undefined,
    trackingHistory: (row.tracking_events ?? []).map(mapTrackingEvent),
    bids: (row.bids ?? []).map(mapBid),
    termsAcceptedAt: row.terms_accepted_at ?? undefined,
    nonCommercialDeclaredAt: row.non_commercial_declared_at ?? undefined,
    transporterTermsAcceptedAt: row.transporter_terms_accepted_at ?? undefined,
  };
}

function mapRoute(row: RouteRow): Route {
  return {
    id: row.id,
    transporterId: row.transporter_id,
    departureCity: row.departure_city,
    departureCountry: row.departure_country,
    arrivalCity: row.arrival_city,
    arrivalCountry: row.arrival_country,
    departureDate: row.departure_date,
    estimatedArrivalDate: row.estimated_arrival_date,
    availableCapacity: Number(row.available_capacity),
    ferryCompany: row.ferry_company,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    text: row.text,
    timestamp: row.created_at,
    read: row.read ?? false,
  };
}

const SHIPMENT_SELECT = '*, tracking_events(*), bids(*)';

// ── Profiles ─────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<User | null> {
  const { data, error } = await db().from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return mapProfile(data);
}

export async function updateProfile(userId: string, updates: Partial<User>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.firstName !== undefined) payload.first_name = updates.firstName;
  if (updates.lastName !== undefined) payload.last_name = updates.lastName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.avatar !== undefined) payload.avatar_url = updates.avatar;
  if (updates.truckDetails !== undefined) payload.truck_details = updates.truckDetails;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.onboarded !== undefined) payload.onboarded = updates.onboarded;
  const { error } = await db().from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
}

// ── Shipments ────────────────────────────────────────────────────────────

export async function fetchShipments(userId: string, role: UserRole): Promise<Shipment[]> {
  let query = db().from('shipments').select(SHIPMENT_SELECT).order('created_at', { ascending: false });
  if (role === 'sender') {
    query = query.eq('sender_id', userId);
  } else {
    query = query.or(`status.eq.pending,transporter_id.eq.${userId}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapShipment);
}

export async function createShipment(
  shipment: Omit<Shipment, 'id' | 'createdAt' | 'trackingHistory' | 'bids'>
): Promise<Shipment> {
  const { data, error } = await db()
    .from('shipments')
    .insert({
      sender_id: shipment.senderId,
      sender_name: shipment.senderName,
      type: shipment.type,
      status: shipment.status,
      weight: shipment.weight ?? null,
      price: shipment.price ?? null,
      items: shipment.items ?? null,
      description: shipment.description ?? null,
      photos: shipment.photos ?? null,
      dimensions: shipment.dimensions ?? null,
      pickup_address: shipment.pickupAddress,
      delivery_address: shipment.deliveryAddress,
      terms_accepted_at: shipment.termsAcceptedAt ?? null,
      non_commercial_declared_at: shipment.nonCommercialDeclaredAt ?? null,
    })
    .select(SHIPMENT_SELECT)
    .single();
  if (error) throw error;

  const { error: teError } = await db().from('tracking_events').insert({
    shipment_id: data.id,
    status: 'pending',
    description: "Envoi créé et publié par l'expéditeur",
    location: `${shipment.pickupAddress.city}, ${shipment.pickupAddress.country}`,
  });
  if (teError) throw teError;

  const created = mapShipment(data);
  created.trackingHistory = [
    {
      id: `te-${data.id}`,
      status: 'pending',
      description: "Envoi créé et publié par l'expéditeur",
      location: `${shipment.pickupAddress.city}, ${shipment.pickupAddress.country}`,
      timestamp: new Date().toISOString(),
    },
  ];
  return created;
}

export async function updateShipment(id: string, updates: Partial<Shipment>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.transporterId !== undefined) payload.transporter_id = updates.transporterId;
  if (updates.transporterName !== undefined) payload.transporter_name = updates.transporterName;
  // Editable listing fields: `'key' in updates` (not `!== undefined`) so an
  // explicit undefined clears the column (e.g. weight when small → large).
  if ('type' in updates) payload.type = updates.type;
  if ('weight' in updates) payload.weight = updates.weight ?? null;
  if ('price' in updates) payload.price = updates.price ?? null;
  if ('items' in updates) payload.items = updates.items ?? null;
  if ('description' in updates) payload.description = updates.description ?? null;
  if ('dimensions' in updates) payload.dimensions = updates.dimensions ?? null;
  if ('photos' in updates) payload.photos = updates.photos ?? null;
  if ('nonCommercialDeclaredAt' in updates)
    payload.non_commercial_declared_at = updates.nonCommercialDeclaredAt ?? null;
  if (updates.pickupAddress !== undefined) payload.pickup_address = updates.pickupAddress;
  if (updates.deliveryAddress !== undefined) payload.delivery_address = updates.deliveryAddress;
  if (updates.selectedBidId !== undefined) payload.selected_bid_id = updates.selectedBidId;
  if (updates.collectedAt !== undefined) payload.collected_at = updates.collectedAt;
  if (updates.deliveredAt !== undefined) payload.delivered_at = updates.deliveredAt;
  if (updates.paidAt !== undefined) payload.paid_at = updates.paidAt;
  if (updates.transporterTermsAcceptedAt !== undefined)
    payload.transporter_terms_accepted_at = updates.transporterTermsAcceptedAt;
  const { error } = await db().from('shipments').update(payload).eq('id', id);
  if (error) throw error;
}

export async function addTrackingEvent(
  shipmentId: string,
  event: Omit<TrackingEvent, 'id' | 'timestamp'>
): Promise<void> {
  const { error } = await db().from('tracking_events').insert({
    shipment_id: shipmentId,
    status: event.status,
    description: event.description,
    location: event.location ?? null,
  });
  if (error) throw error;
}

// ── Bids ─────────────────────────────────────────────────────────────────

export async function createBid(
  bid: Omit<Bid, 'id' | 'createdAt' | 'status'>
): Promise<Bid> {
  const { data, error } = await db()
    .from('bids')
    .insert({
      shipment_id: bid.shipmentId,
      transporter_id: bid.transporterId,
      transporter_name: bid.transporterName,
      transporter_rating: bid.transporterRating,
      price: bid.price,
      estimated_delivery: bid.estimatedDelivery,
      message: bid.message ?? null,
      status: 'pending',
      terms_accepted_at: bid.termsAcceptedAt ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapBid(data);
}

/**
 * Direct take-over of a small parcel by a transporter. Goes through a
 * SECURITY DEFINER transaction because assignment columns are locked for
 * client-side updates by the shipments guard trigger.
 */
export async function acceptSmallShipment(shipmentId: string): Promise<void> {
  const { error } = await db().rpc('accept_small_shipment_transaction', {
    p_shipment_id: shipmentId,
  });
  if (error) throw error;
}

/**
 * Sender opts to pay in cash at handover. paid_at is server-managed
 * (locked by the shipments guard trigger), hence the SECURITY DEFINER RPC.
 */
export async function chooseCashPayment(shipmentId: string): Promise<void> {
  const { error } = await db().rpc('choose_cash_payment', {
    p_shipment_id: shipmentId,
  });
  if (error) throw error;
}

/**
 * Sender confirms they received the parcel: the shipment becomes
 * 'delivered' and its amount is counted toward the transporter's earnings.
 * status/delivered_at are locked for the sender by the shipments guard
 * trigger, hence the SECURITY DEFINER RPC.
 */
export async function confirmDelivery(shipmentId: string): Promise<void> {
  const { error } = await db().rpc('confirm_delivery', {
    p_shipment_id: shipmentId,
  });
  if (error) throw error;
}

export async function acceptBid(shipmentId: string, bidId: string): Promise<void> {
  const { error } = await db().rpc('accept_bid_transaction', {
    p_shipment_id: shipmentId,
    p_bid_id: bidId,
  });
  if (error) throw error;
}

// ── Routes ───────────────────────────────────────────────────────────────

export async function fetchRoutes(): Promise<Route[]> {
  const { data, error } = await db()
    .from('routes')
    .select('*')
    .order('departure_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRoute);
}

export async function createRoute(route: Omit<Route, 'id'>): Promise<Route> {
  const { data, error } = await db()
    .from('routes')
    .insert({
      transporter_id: route.transporterId,
      departure_city: route.departureCity,
      departure_country: route.departureCountry,
      arrival_city: route.arrivalCity,
      arrival_country: route.arrivalCountry,
      departure_date: route.departureDate,
      estimated_arrival_date: route.estimatedArrivalDate,
      available_capacity: route.availableCapacity,
      ferry_company: route.ferryCompany,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRoute(data);
}

// ── Live tracking (positions GPS) ────────────────────────────────────────

function mapShipmentLocation(row: ShipmentLocationRow): ShipmentLocation {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    transporterId: row.transporter_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    heading: row.heading != null ? Number(row.heading) : undefined,
    speed: row.speed != null ? Number(row.speed) : undefined,
    accuracy: row.accuracy != null ? Number(row.accuracy) : undefined,
    recordedAt: row.recorded_at,
  };
}

// Dernière position de plusieurs envois en UNE seule requête (RPC groupée
// `get_latest_shipment_locations`) — jamais une requête par envoi (N+1).
export async function fetchLatestLocations(
  shipmentIds: string[]
): Promise<Record<string, ShipmentLocation>> {
  if (shipmentIds.length === 0) return {};
  const { data, error } = await db().rpc('get_latest_shipment_locations', {
    p_shipment_ids: shipmentIds,
  });
  if (error) throw error;
  const byShipment: Record<string, ShipmentLocation> = {};
  (data as ShipmentLocationRow[] ?? []).forEach((row) => {
    const loc = mapShipmentLocation(row);
    byShipment[loc.shipmentId] = loc;
  });
  return byShipment;
}

export async function fetchLocationHistory(
  shipmentId: string,
  limit = 100
): Promise<ShipmentLocation[]> {
  const { data, error } = await db()
    .from('shipment_locations')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapShipmentLocation).reverse();
}

export async function publishShipmentLocation(
  location: Omit<ShipmentLocation, 'id' | 'recordedAt'>
): Promise<void> {
  const { error } = await db().from('shipment_locations').insert({
    shipment_id: location.shipmentId,
    transporter_id: location.transporterId,
    latitude: location.latitude,
    longitude: location.longitude,
    heading: location.heading ?? null,
    speed: location.speed ?? null,
    accuracy: location.accuracy ?? null,
  });
  if (error) throw error;
}

// Abonnement Realtime aux nouvelles positions d'un envoi. Retourne la
// fonction de désinscription — à appeler impérativement au démontage.
export function subscribeToShipmentLocation(
  shipmentId: string,
  onLocation: (location: ShipmentLocation) => void,
  onStatusChange?: (connected: boolean) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`shipment-location-${shipmentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shipment_locations',
        filter: `shipment_id=eq.${shipmentId}`,
      },
      (payload) => onLocation(mapShipmentLocation(payload.new as ShipmentLocationRow))
    )
    .subscribe((status) => onStatusChange?.(status === 'SUBSCRIBED'));
  return () => {
    supabase?.removeChannel(channel);
  };
}

// ── Conversations & messages ─────────────────────────────────────────────

export async function fetchConversations(
  userId: string
): Promise<{ conversations: Conversation[]; messages: Message[] }> {
  const client = db();
  const { data: parts, error: pErr } = await client
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);
  if (pErr) throw pErr;
  const ids = (parts as { conversation_id: string }[] ?? []).map((p) => p.conversation_id);
  if (ids.length === 0) return { conversations: [], messages: [] };

  const { data, error } = await client
    .from('conversations')
    .select('*, conversation_participants(user_id, display_name), messages(*)')
    .in('id', ids)
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'messages', ascending: true });
  if (error) throw error;

  const allMessages: Message[] = [];
  const conversations = ((data as unknown as ConversationRow[]) ?? []).map((row) => {
    const participants: string[] = (row.conversation_participants ?? []).map((p) => p.user_id);
    const participantNames: Record<string, string> = {};
    (row.conversation_participants ?? []).forEach((p) => {
      participantNames[p.user_id] = p.display_name ?? '';
    });
    const msgs: Message[] = (row.messages ?? []).map(mapMessage);
    allMessages.push(...msgs);
    const last = msgs[msgs.length - 1];
    const unreadCount = msgs.filter((m) => !m.read && m.senderId !== userId).length;
    return {
      id: row.id,
      participants,
      participantNames,
      shipmentId: row.shipment_id ?? undefined,
      lastMessage: last,
      unreadCount,
      updatedAt: row.updated_at,
    } as Conversation;
  });

  return { conversations, messages: allMessages };
}

export async function createConversation(params: {
  me: { id: string; name: string };
  other: { id: string; name: string };
  shipmentId?: string;
}): Promise<Conversation> {
  const client = db();
  const { data, error } = await client
    .from('conversations')
    .insert({ shipment_id: params.shipmentId ?? null })
    .select('*')
    .single();
  if (error) throw error;

  // Insert self first: the RLS policy then lets us add the other participant.
  const { error: meError } = await client.from('conversation_participants').insert({
    conversation_id: data.id,
    user_id: params.me.id,
    display_name: params.me.name,
  });
  if (meError) throw meError;
  const { error: otherError } = await client.from('conversation_participants').insert({
    conversation_id: data.id,
    user_id: params.other.id,
    display_name: params.other.name,
  });
  if (otherError) throw otherError;

  return {
    id: data.id,
    participants: [params.me.id, params.other.id],
    participantNames: {
      [params.me.id]: params.me.name,
      [params.other.id]: params.other.name,
    },
    shipmentId: params.shipmentId,
    unreadCount: 0,
    updatedAt: data.updated_at ?? data.created_at,
  };
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await db()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(
  message: Pick<Message, 'conversationId' | 'senderId' | 'text'>
): Promise<Message> {
  const { data, error } = await db()
    .from('messages')
    .insert({
      conversation_id: message.conversationId,
      sender_id: message.senderId,
      text: message.text,
    })
    .select('*')
    .single();
  if (error) throw error;
  await db()
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', message.conversationId);
  return mapMessage(data);
}

// ── Ratings & push tokens ────────────────────────────────────────────────

export async function submitRating(params: {
  shipmentId: string;
  raterId: string;
  ratedUserId: string;
  stars: number;
  tags?: string[];
  comment?: string;
  photos?: string[];
}): Promise<void> {
  const { error } = await db().from('ratings').insert({
    shipment_id: params.shipmentId,
    rater_id: params.raterId,
    rated_user_id: params.ratedUserId,
    stars: params.stars,
    tags: params.tags ?? null,
    comment: params.comment ?? null,
    photos: params.photos ?? null,
  });
  if (error) throw error;
}

/** Uploads one review photo to the public `review-photos` bucket. */
export async function uploadReviewPhoto(userId: string, localUri: string): Promise<string> {
  const bytes = await readImageBytes(localUri);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await db()
    .storage.from('review-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = db().storage.from('review-photos').getPublicUrl(path);
  return data.publicUrl;
}

/** Public list of reviews a user has received (with the rater's first name). */
export async function listUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await db().rpc('list_user_reviews', { p_user_id: userId });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    ratedUserId: userId,
    raterName: row.rater_name ?? 'Utilisateur',
    stars: row.stars,
    tags: row.tags ?? undefined,
    comment: row.comment ?? undefined,
    photos: row.photos ?? undefined,
    createdAt: row.created_at,
  }));
}

// ── Paiements transporteur : coordonnées bancaires & retraits ─────────────

/** Reads the transporter's own bank details (owner-only via RLS). */
export async function fetchPayoutAccount(userId: string): Promise<PayoutAccount | null> {
  const { data, error } = await db()
    .from('payout_accounts')
    .select('holder, iban, bank_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    holder: data.holder ?? '',
    iban: data.iban ?? '',
    bankName: data.bank_name ?? undefined,
  };
}

/** Creates or updates the transporter's bank details. */
export async function savePayoutAccount(userId: string, account: PayoutAccount): Promise<void> {
  const { error } = await db()
    .from('payout_accounts')
    .upsert(
      {
        user_id: userId,
        holder: account.holder,
        iban: account.iban,
        bank_name: account.bankName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

function mapPayoutRequest(row: any): PayoutRequest {
  return {
    id: row.id,
    amount: Number(row.amount),
    status: row.status,
    iban: row.iban ?? '',
    holder: row.holder ?? '',
    note: row.note ?? undefined,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? undefined,
  };
}

/** Lists the transporter's own payout requests, newest first. */
export async function fetchPayoutRequests(userId: string): Promise<PayoutRequest[]> {
  const { data, error } = await db()
    .from('payout_requests')
    .select('*')
    .eq('transporter_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPayoutRequest);
}

/**
 * Requests a payout of the full available balance. The server recomputes the
 * available amount (delivered & paid shipments minus already-requested payouts)
 * and enforces the 10 € minimum and the presence of an IBAN.
 */
export async function requestPayout(): Promise<PayoutRequest> {
  const { data, error } = await db().rpc('request_payout');
  if (error) throw error;
  return mapPayoutRequest(data);
}

// ── Administration ────────────────────────────────────────────────────────

/** Global dashboard stats — admin only (enforced server-side by the RPC). */
export async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await db().rpc('admin_stats');
  if (error) throw error;
  const d = (data ?? {}) as Record<string, number>;
  return {
    users: Number(d.users ?? 0),
    transporters: Number(d.transporters ?? 0),
    senders: Number(d.senders ?? 0),
    shipments: Number(d.shipments ?? 0),
    delivered: Number(d.delivered ?? 0),
    pendingKyc: Number(d.pending_kyc ?? 0),
    pendingPayoutsCount: Number(d.pending_payouts_count ?? 0),
    pendingPayoutsAmount: Number(d.pending_payouts_amount ?? 0),
    openDisputes: Number(d.open_disputes ?? 0),
    gmv: Number(d.gmv ?? 0),
    commission: Number(d.commission ?? 0),
    transporterEarnings: Number(d.transporter_earnings ?? 0),
    escrow: Number(d.escrow ?? 0),
    paidOut: Number(d.paid_out ?? 0),
    referralCredits: Number(d.referral_credits ?? 0),
  };
}

/** All payout requests with the transporter's name — admin only. */
export async function listPayoutRequestsAdmin(): Promise<PayoutRequestAdmin[]> {
  const { data, error } = await db().rpc('list_payout_requests_admin');
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    transporterId: row.transporter_id,
    transporterName: row.transporter_name ?? 'Transporteur',
    transporterEmail: row.transporter_email ?? '',
    amount: Number(row.amount),
    status: row.status,
    iban: row.iban ?? '',
    holder: row.holder ?? '',
    createdAt: row.created_at,
    processedAt: row.processed_at ?? undefined,
  }));
}

/** Mark a payout request as paid/rejected/pending — admin only. */
export async function setPayoutStatus(requestId: string, status: PayoutStatus): Promise<void> {
  const { error } = await db().rpc('set_payout_status', {
    p_request_id: requestId,
    p_status: status,
  });
  if (error) throw error;
}

// ── Admin : gestion des utilisateurs ──────────────────────────────────────

export async function listUsersAdmin(search = ''): Promise<AdminUser[]> {
  const { data, error } = await db().rpc('list_users_admin', { p_search: search });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    email: row.email ?? '',
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    phone: row.phone ?? '',
    role: row.role as UserRole,
    isAdmin: row.is_admin ?? false,
    identityStatus: (row.identity_status as IdentityStatus) ?? 'unsubmitted',
    suspended: row.suspended ?? false,
    createdAt: row.created_at,
  }));
}

export async function setUserSuspended(userId: string, suspended: boolean): Promise<void> {
  const { error } = await db().rpc('set_user_suspended', { p_user_id: userId, p_suspended: suspended });
  if (error) throw error;
}

export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const { error } = await db().rpc('set_user_admin', { p_user_id: userId, p_is_admin: isAdmin });
  if (error) throw error;
}

export async function adminSetIdentity(userId: string, status: IdentityStatus): Promise<void> {
  const { error } = await db().rpc('admin_set_identity', { p_user_id: userId, p_status: status });
  if (error) throw error;
}

// ── Admin : gestion des envois ────────────────────────────────────────────

export async function listShipmentsAdmin(search = ''): Promise<AdminShipment[]> {
  const { data, error } = await db().rpc('list_shipments_admin', { p_search: search });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    senderName: row.sender_name ?? '',
    transporterName: row.transporter_name ?? '',
    type: row.type ?? '',
    status: row.status as ShipmentStatus,
    price: row.price != null ? Number(row.price) : undefined,
    pickupCity: row.pickup_city ?? '',
    deliveryCity: row.delivery_city ?? '',
    createdAt: row.created_at,
  }));
}

export async function adminCancelShipment(shipmentId: string): Promise<void> {
  const { error } = await db().rpc('admin_cancel_shipment', { p_shipment_id: shipmentId });
  if (error) throw error;
}

export async function fetchAdminShipmentDetail(shipmentId: string): Promise<AdminShipmentDetail> {
  const { data, error } = await db().rpc('admin_shipment_detail', { p_id: shipmentId });
  if (error) throw error;
  if (!data) throw new Error('Envoi introuvable.');
  return data as AdminShipmentDetail;
}

// ── Admin : modération des avis ───────────────────────────────────────────

export async function listReviewsAdmin(): Promise<AdminReview[]> {
  const { data, error } = await db().rpc('list_reviews_admin');
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    stars: row.stars,
    comment: row.comment ?? undefined,
    tags: row.tags ?? undefined,
    photos: row.photos ?? undefined,
    createdAt: row.created_at,
    raterName: row.rater_name ?? 'Utilisateur',
    ratedName: row.rated_name ?? 'Utilisateur',
  }));
}

export async function adminDeleteReview(reviewId: string): Promise<void> {
  const { error } = await db().rpc('admin_delete_review', { p_review_id: reviewId });
  if (error) throw error;
}

// ── Annonces (broadcast) ──────────────────────────────────────────────────

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await db()
    .from('announcements')
    .select('id, title, body, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function createAnnouncement(title: string, body: string): Promise<void> {
  const { error } = await db().rpc('create_announcement', { p_title: title, p_body: body });
  if (error) throw error;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await db()
    .from('push_tokens')
    .upsert({ user_id: userId, token }, { onConflict: 'user_id,token' });
  if (error) throw error;
}

// ── Shipment photos ───────────────────────────────────────────────────────

// Uploads one local photo to the public `shipment-photos` bucket and returns
// its public URL (stored as-is in shipments.photos).
// Web pickers return blob:/data: URLs and expo-file-system does not exist in
// the browser — read those with fetch(); native file:// URIs go through
// FileSystem.
async function readImageBytes(localUri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    return await response.arrayBuffer();
  }
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decode(base64);
}

export async function uploadShipmentPhoto(userId: string, localUri: string): Promise<string> {
  const bytes = await readImageBytes(localUri);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await db()
    .storage.from('shipment-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = db().storage.from('shipment-photos').getPublicUrl(path);
  return data.publicUrl;
}

// Uploads a profile picture to the public `shipment-photos` bucket (already
// public-read + authenticated-write) and returns its public URL. Reusing that
// bucket avoids a new storage migration; the URL is stored in profiles.avatar_url.
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const bytes = await readImageBytes(localUri);
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { error } = await db()
    .storage.from('shipment-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = db().storage.from('shipment-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ── Identity verification (KYC) ───────────────────────────────────────────

export async function uploadIdentityDocument(
  userId: string,
  side: 'front' | 'back',
  localUri: string
): Promise<string> {
  const bytes = await readImageBytes(localUri);
  const path = `${userId}/${side}-${Date.now()}.jpg`;
  const { error } = await db()
    .storage.from('identity-documents')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

// ── Identity review (admin) ───────────────────────────────────────────────

export interface PendingIdentity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  documentType: string;
  frontPath: string;
  backPath?: string;
  submittedAt?: string;
}

interface PendingIdentityRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  document_type: string;
  front_path: string;
  back_path: string | null;
  submitted_at: string | null;
}

/** Pending KYC submissions — admin only (enforced server-side by the RPC). */
export async function listPendingIdentities(): Promise<PendingIdentity[]> {
  const { data, error } = await db().rpc('list_pending_identities');
  if (error) throw error;
  return ((data ?? []) as PendingIdentityRow[]).map((row) => ({
    id: row.id,
    email: row.email ?? '',
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    documentType: row.document_type ?? '',
    frontPath: row.front_path ?? '',
    backPath: row.back_path ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
  }));
}

/** Short-lived signed URL so the reviewer can see a private identity photo. */
export async function getIdentityDocumentUrl(path: string): Promise<string> {
  const { data, error } = await db()
    .storage.from('identity-documents')
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) throw error ?? new Error('Document introuvable.');
  return data.signedUrl;
}

/** Approve or reject a pending submission — admin only (enforced by the RPC). */
export async function reviewIdentity(
  targetUserId: string,
  approve: boolean,
  reason?: string
): Promise<void> {
  const { error } = await db().rpc('review_identity', {
    target: targetUserId,
    approve,
    reason: reason ?? null,
  });
  if (error) throw error;
}

/**
 * Notifie l'utilisateur par e-mail que son identité vient d'être approuvée.
 * Best-effort : appelée après review_identity côté admin ; ne doit jamais
 * bloquer l'approbation (l'appelant l'entoure d'un try/catch silencieux).
 */
export async function notifyIdentityApproved(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('notify-verification', {
    body: { userId },
  });
  if (error) throw error;
}

/**
 * Supprime définitivement le compte de l'utilisateur courant (profil + toutes
 * les données liées, en cascade). Refusé par le serveur s'il reste un envoi en
 * cours ou une demande de retrait en attente.
 */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await db().rpc('delete_own_account');
  if (error) throw error;
}

export async function submitIdentityVerification(
  userId: string,
  documentType: string,
  frontPath: string,
  backPath?: string
): Promise<void> {
  const { error } = await db()
    .from('profiles')
    .update({
      identity_status: 'pending',
      identity_document_type: documentType,
      identity_document_front_url: frontPath,
      identity_document_back_url: backPath ?? null,
      identity_submitted_at: new Date().toISOString(),
      identity_rejection_reason: null,
    })
    .eq('id', userId);
  if (error) throw error;
}

// ── Signalements / litiges ──────────────────────────────────────────────────

function mapDispute(row: any): Dispute {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    category: row.category as DisputeCategory,
    description: row.description ?? '',
    status: row.status as DisputeStatus,
    adminNote: row.admin_note ?? undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

export async function createDispute(
  shipmentId: string,
  category: DisputeCategory,
  description: string
): Promise<void> {
  const { error } = await db().rpc('create_dispute', {
    p_shipment_id: shipmentId,
    p_category: category,
    p_description: description,
  });
  if (error) throw error;
}

export async function listMyDisputes(): Promise<Dispute[]> {
  const { data, error } = await db().rpc('list_my_disputes');
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapDispute);
}

export async function listDisputesAdmin(): Promise<AdminDispute[]> {
  const { data, error } = await db().rpc('list_disputes_admin');
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    ...mapDispute(row),
    reporterName: row.reporter_name ?? '',
    reporterRole: row.reporter_role ?? '',
  }));
}

export async function setDisputeStatus(
  id: string,
  status: DisputeStatus,
  note?: string
): Promise<void> {
  const { error } = await db().rpc('set_dispute_status', {
    p_id: id,
    p_status: status,
    p_note: note ?? null,
  });
  if (error) throw error;
}

// ── Parrainage ──────────────────────────────────────────────────────────────

export async function applyReferralCode(code: string): Promise<void> {
  const { error } = await db().rpc('apply_referral_code', { p_code: code });
  if (error) throw error;
}

export async function fetchReferralSummary(): Promise<ReferralSummary> {
  const { data, error } = await db().rpc('my_referral_summary');
  if (error) throw error;
  const row = (data ?? {}) as any;
  return {
    code: row.code ?? '',
    balance: Number(row.balance ?? 0),
    invited: Number(row.invited ?? 0),
    rewarded: Number(row.rewarded ?? 0),
    referred: Boolean(row.referred),
  };
}

export async function listMyReferrals(): Promise<ReferralItem[]> {
  const { data, error } = await db().rpc('list_my_referrals');
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    referredName: row.referred_name ?? '',
    status: row.status as ReferralItemStatus,
    createdAt: row.created_at,
    rewardedAt: row.rewarded_at ?? undefined,
  }));
}
