import * as FileSystem from 'expo-file-system';
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
} from '../types';

function db() {
  if (!supabase) throw new Error('Supabase non configuré (mode démo).');
  return supabase;
}

// ── Mappers (snake_case → camelCase) ─────────────────────────────────────

export function mapProfile(row: any): User {
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
    identityStatus: row.identity_status ?? 'unsubmitted',
    identityDocumentType: row.identity_document_type ?? undefined,
    identityRejectionReason: row.identity_rejection_reason ?? undefined,
  };
}

function mapTrackingEvent(row: any): TrackingEvent {
  return {
    id: row.id,
    status: row.status,
    description: row.description,
    location: row.location ?? undefined,
    timestamp: row.created_at,
  };
}

function mapBid(row: any): Bid {
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
  };
}

function mapShipment(row: any): Shipment {
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
    selectedBidId: row.selected_bid_id ?? undefined,
    trackingHistory: (row.tracking_events ?? []).map(mapTrackingEvent),
    bids: (row.bids ?? []).map(mapBid),
  };
}

function mapRoute(row: any): Route {
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

function mapMessage(row: any): Message {
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
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.selectedBidId !== undefined) payload.selected_bid_id = updates.selectedBidId;
  if (updates.collectedAt !== undefined) payload.collected_at = updates.collectedAt;
  if (updates.deliveredAt !== undefined) payload.delivered_at = updates.deliveredAt;
  if (updates.paidAt !== undefined) payload.paid_at = updates.paidAt;
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
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapBid(data);
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

function mapShipmentLocation(row: any): ShipmentLocation {
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
  (data ?? []).forEach((row: any) => {
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
      (payload) => onLocation(mapShipmentLocation(payload.new))
    )
    .subscribe((status) => onStatusChange?.(status === 'SUBSCRIBED'));
  return () => {
    supabase?.removeChannel(channel);
  };
}

// ── Conversations & messages ─────────────────────────────────────────────

export async function fetchConversations(userId: string): Promise<{ conversations: Conversation[]; messages: Message[] }> {
  const client = db();
  const { data: parts, error: pErr } = await client
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);
  if (pErr) throw pErr;
  const ids = (parts ?? []).map((p: any) => p.conversation_id);
  if (ids.length === 0) return { conversations: [], messages: [] };

  const { data, error } = await client
    .from('conversations')
    .select('*, conversation_participants(user_id, display_name), messages(*)')
    .in('id', ids)
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'messages', ascending: true });
  if (error) throw error;

  const allMessages: Message[] = [];
  const conversations = (data ?? []).map((row: any) => {
    const participants: string[] = (row.conversation_participants ?? []).map((p: any) => p.user_id);
    const participantNames: Record<string, string> = {};
    (row.conversation_participants ?? []).forEach((p: any) => {
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
}): Promise<void> {
  const { error } = await db().from('ratings').insert({
    shipment_id: params.shipmentId,
    rater_id: params.raterId,
    rated_user_id: params.ratedUserId,
    stars: params.stars,
    tags: params.tags ?? null,
    comment: params.comment ?? null,
  });
  if (error) throw error;
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  const { error } = await db()
    .from('push_tokens')
    .upsert({ user_id: userId, token }, { onConflict: 'user_id,token' });
  if (error) throw error;
}

// ── Identity verification (KYC) ───────────────────────────────────────────

export async function uploadIdentityDocument(
  userId: string,
  side: 'front' | 'back',
  localUri: string
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const path = `${userId}/${side}-${Date.now()}.jpg`;
  const { error } = await db()
    .storage.from('identity-documents')
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
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
