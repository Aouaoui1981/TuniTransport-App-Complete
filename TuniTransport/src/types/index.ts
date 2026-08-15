// ─────────────────────────────────────
// TuniTransport -- core data models
// ─────────────────────────────────────

export type UserRole = 'sender' | 'transporter';

export type ShipmentType = 'small' | 'large';

export type ShipmentStatus =
  | 'pending'
  | 'accepted'
  | 'dropped_off'
  | 'collected'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

/**
 * Comment le colis passe de l'expéditeur au transporteur.
 *  - 'home'  : le transporteur se déplace jusqu'à l'expéditeur (frais).
 *  - 'point' : l'expéditeur dépose au point de collecte convenu.
 */
export type HandoverMode = 'home' | 'point';

/** Point de collecte : lieu habituel d'un transporteur, ou lieu convenu. */
export interface CollectionPoint {
  label: string;
  address?: string;
  /** Horaires ou consigne libre (« du lundi au samedi, 9h–18h »). */
  notes?: string;
}

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
  /** Point de collecte habituel — transporteurs uniquement, facultatif. */
  collectionPoint?: CollectionPoint;
  identityStatus: IdentityStatus;
  identityDocumentType?: string;
  identityRejectionReason?: string;
  /** Platform staff — unlocks the identity review screen. */
  isAdmin?: boolean;
  /** Suspended by an admin — blocked from using the app. */
  suspended?: boolean;
  /** false for social-login accounts that still need to choose role/details. */
  onboarded?: boolean;
}

export type OAuthProvider = 'google' | 'apple' | 'facebook';

/** Avis public laissé par un expéditeur sur un transporteur (ou l'inverse). */
export interface Review {
  id: string;
  ratedUserId: string;
  raterName: string;
  stars: number;
  tags?: string[];
  comment?: string;
  photos?: string[];
  createdAt: string;
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

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// Position GPS publiée par le transporteur pendant le transport (live tracking).
export interface ShipmentLocation extends GeoPoint {
  id: string;
  shipmentId: string;
  transporterId: string;
  heading?: number; // degrés, 0 = nord
  speed?: number; // m/s
  accuracy?: number; // mètres
  recordedAt: string;
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
  // Horodatage du consentement légal du transporteur au moment du devis
  // (traçabilité juridique — cf. docs/PRICING_AND_LEGAL.md).
  termsAcceptedAt?: string;
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
  paidAt?: string;
  /** 'card' (Stripe) or 'cash' (paid in person at handover). Null = card. */
  paymentMethod?: 'card' | 'cash';
  selectedBidId?: string;
  /**
   * Jeton imprimé dans le QR de l'étiquette. L'étiquette elle-même ne
   * porte aucune donnée personnelle : ce jeton est la seule clé qui, via
   * `resolveLabel`, ouvre les détails — et uniquement à l'expéditeur, au
   * transporteur attitré ou à un administrateur.
   */
  labelToken?: string;
  /** Mode de remise choisi par l'expéditeur à la création. */
  handoverMode?: HandoverMode;
  /** Frais de déplacement facturés quand le transporteur vient sur place. */
  handoverFee?: number;
  /** Lieu de remise convenu (repris du profil du transporteur ou négocié). */
  handoverPoint?: CollectionPoint;
  /** Dépôt déclaré par l'expéditeur, avec sa photo. */
  droppedOffAt?: string;
  droppedOffPhoto?: string;
  /** Photo prise par le transporteur au moment de la prise en charge. */
  collectedPhoto?: string;
  trackingHistory: TrackingEvent[];
  bids?: Bid[];
  // Horodatages des consentements légaux (traçabilité juridique) :
  // acceptation des conditions par l'expéditeur à la publication,
  // déclaration « non commercial » (colis au poids), et acceptation des
  // conditions par le transporteur à la prise en charge d'un colis standard.
  termsAcceptedAt?: string;
  nonCommercialDeclaredAt?: string;
  transporterTermsAcceptedAt?: string;
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

// ─── Payments ──────────────────────────────────

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'canceled';

// Ledger row managed exclusively by the payment Edge Functions (read-only
// for clients). Amounts are integer cents; platform fee + transporter
// amount always equal the charged total.
export interface Payment {
  id: string;
  shipmentId: string;
  senderId: string;
  transporterId?: string;
  provider: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  transporterAmountCents: number;
  status: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
  paidAt?: string;
  createdAt: string;
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
  /** Code de parrainage saisi à l'inscription (facultatif). */
  referralCode?: string;
}

// Coordonnées bancaires du transporteur (privées).
export interface PayoutAccount {
  holder: string;
  iban: string;
  bankName?: string;
}

export type PayoutStatus = 'pending' | 'paid' | 'rejected';

// Demande de retrait des gains du transporteur.
export interface PayoutRequest {
  id: string;
  amount: number;
  status: PayoutStatus;
  iban: string;
  holder: string;
  note?: string;
  createdAt: string;
  processedAt?: string;
}

// Demande de retrait vue par l'administrateur (avec le nom du transporteur).
export interface PayoutRequestAdmin extends PayoutRequest {
  transporterId: string;
  transporterName: string;
  transporterEmail: string;
}

// Statistiques globales du tableau de bord administrateur.
export interface AdminStats {
  users: number;
  transporters: number;
  senders: number;
  shipments: number;
  delivered: number;
  pendingKyc: number;
  pendingPayoutsCount: number;
  pendingPayoutsAmount: number;
  openDisputes: number;
  // Finances (en euros)
  gmv: number;
  commission: number;
  transporterEarnings: number;
  escrow: number;
  paidOut: number;
  referralCredits: number;
}

// Utilisateur vu par l'administrateur (gestion des comptes).
export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  isAdmin: boolean;
  identityStatus: IdentityStatus;
  suspended: boolean;
  createdAt: string;
}

// Envoi vu par l'administrateur (supervision).
export interface AdminShipment {
  id: string;
  senderName: string;
  transporterName: string;
  type: string;
  status: ShipmentStatus;
  price?: number;
  pickupCity: string;
  deliveryCity: string;
  createdAt: string;
}

// Avis vu par l'administrateur (modération).
export interface AdminReview {
  id: string;
  stars: number;
  comment?: string;
  tags?: string[];
  photos?: string[];
  createdAt: string;
  raterName: string;
  ratedName: string;
}

// Annonce diffusée à tous les utilisateurs.
export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

// ── Signalements / litiges ──────────────────────────────────────────────────
export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type DisputeCategory =
  | 'lost'
  | 'damaged'
  | 'delay'
  | 'not_as_described'
  | 'no_show'
  | 'handover_disputed'
  | 'other';

export interface Dispute {
  id: string;
  shipmentId: string;
  category: DisputeCategory;
  description: string;
  status: DisputeStatus;
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AdminDispute extends Dispute {
  reporterName: string;
  reporterRole: string;
}

// ── Parrainage ──────────────────────────────────────────────────────────────
export interface ReferralSummary {
  code: string;
  balance: number;
  invited: number;
  rewarded: number;
  /** true si l'utilisateur a lui-même été parrainé (a déjà utilisé un code). */
  referred: boolean;
}

// Détail complet d'un envoi côté admin.
export interface AdminShipmentContact {
  name: string;
  email?: string;
  phone?: string;
}
export interface AdminShipmentDetail {
  id: string;
  type: string;
  status: ShipmentStatus;
  weight?: number;
  price?: number;
  dimensions?: string;
  description?: string;
  items?: Item[];
  photos?: string[];
  paymentMethod?: 'card' | 'cash';
  createdAt: string;
  collectedAt?: string;
  deliveredAt?: string;
  paidAt?: string;
  pickup?: Address;
  delivery?: Address;
  sender: AdminShipmentContact;
  transporter?: AdminShipmentContact | null;
  acceptedBid?: { price: number; estimatedDelivery: string; message?: string } | null;
  bidsCount: number;
}

export type ReferralItemStatus = 'pending' | 'rewarded' | 'expired';

export interface ReferralItem {
  referredName: string;
  status: ReferralItemStatus;
  createdAt: string;
  rewardedAt?: string;
}
