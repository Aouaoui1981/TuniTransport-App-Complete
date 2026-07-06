// ─────────────────────────────────────
// TuniTransport -- core data models
// ─────────────────────────────────────

export type UserRole = 'sender' | 'transporter';

export type ShipmentType = 'small' | 'large';

export type ShipmentStatus =
  | 'pending'
  | 'accepted'
  | 'collected'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export type BidStatus = 'pending' | 'accepted' | 'rejected';

export type IdentityStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected';

export interface TruckDetails {
  vehicleType?: string;
  plateNumber?: string;
  maxCapacityKg?: number;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  rating: number;
  totalRatings: number;
  createdAt: string;
  truckDetails?: TruckDetails;
  identityStatus: IdentityStatus;
  identityDocumentType?: string;
  identityRejectionReason?: string;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  contactName: string;
  contactPhone: string;
  latitude: number;
  longitude: number;
}

export interface Item {
  name: string;
  category: string;
  quantity: number;
  weight: number;
}

export interface TrackingEvent {
  id: string;
  status: ShipmentStatus;
  description: string;
  location?: string;
  timestamp: string;
}

export interface Bid {
  id: string;
  transporterId: string;
  transporterName: string;
  transporterRating: number;
  shipmentId: string;
  price: number;
  estimatedDelivery: string;
  message?: string;
  createdAt: string;
  status: BidStatus;
}

export interface Shipment {
  id: string;
  senderId: string;
  senderName: string;
  transporterId?: string;
  transporterName?: string;
  type: ShipmentType;
  status: ShipmentStatus;
  weight?: number;
  price?: number;
  items?: Item[];
  description?: string;
  photos?: string[];
  dimensions?: string;
  pickupAddress: Address;
  deliveryAddress: Address;
  createdAt: string;
  collectedAt?: string;
  deliveredAt?: string;
  selectedBidId?: string;
  trackingHistory: TrackingEvent[];
  bids?: Bid[];
}

export interface Route {
  id: string;
  // Not explicitly listed in the spec's data model, but required for any
  // "my routes" query -- every route belongs to a transporter.
  transporterId: string;
  departureCity: string;
  departureCountry: string;
  arrivalCity: string;
  arrivalCountry: string;
  departureDate: string;
  estimatedArrivalDate: string;
  availableCapacity: number;
  ferryCompany: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  shipmentId?: string;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

// ─── Auth payloads ─────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
}
