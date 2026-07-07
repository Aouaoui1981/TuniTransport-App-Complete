// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — demo seed data (STEP 15)
// Realistic French/Tunisian data walking through the ferry lifecycle.
// ──────────────────────────────────────────────────────────────────────────
import { User, Shipment, Route, Conversation, Message, Bid, TrackingEvent } from '../types';

// Shared city coordinates (used by CreateShipment / CreateRoute / Map)
export const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  Paris: { latitude: 48.8566, longitude: 2.3522 },
  Lyon: { latitude: 45.764, longitude: 4.8357 },
  Marseille: { latitude: 43.2965, longitude: 5.3698 },
  Nice: { latitude: 43.7102, longitude: 7.262 },
  Toulouse: { latitude: 43.6047, longitude: 1.4442 },
  Sète: { latitude: 43.4023, longitude: 3.6966 },
  Tunis: { latitude: 36.8065, longitude: 10.1815 },
  Sousse: { latitude: 35.8256, longitude: 10.6084 },
  Sfax: { latitude: 34.7406, longitude: 10.7603 },
  Bizerte: { latitude: 37.2744, longitude: 9.8739 },
  Nabeul: { latitude: 36.4561, longitude: 10.7376 },
  Monastir: { latitude: 35.7643, longitude: 10.8113 },
};

export function coordsFor(city: string) {
  return CITY_COORDS[city.trim()] ?? { latitude: 0, longitude: 0 };
}

// Strict variant for map drawing: unknown cities yield no coordinates at all
// instead of a bogus (0, 0) point in the Atlantic.
export function findCityCoords(city: string) {
  return CITY_COORDS[city.trim()] ?? null;
}

// ── Users ────────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  {
    id: 'u-sender-1',
    email: 'sender@demo.com',
    firstName: 'Amine',
    lastName: 'Ben Salah',
    phone: '+33 6 12 34 56 78',
    role: 'sender',
    rating: 4.7,
    totalRatings: 12,
    createdAt: '2025-11-04T10:00:00.000Z',
    identityStatus: 'verified',
  },
  {
    id: 'u-transporter-1',
    email: 'transport@demo.com',
    firstName: 'Karim',
    lastName: 'Trabelsi',
    phone: '+216 22 111 222',
    role: 'transporter',
    rating: 4.8,
    totalRatings: 36,
    createdAt: '2025-09-18T10:00:00.000Z',
    truckDetails: { vehicleType: 'Fourgon Renault Master', maxCapacityKg: 800 },
    identityStatus: 'verified',
  },
  {
    id: 'u-transporter-2',
    email: 'mehdi@demo.com',
    firstName: 'Mehdi',
    lastName: 'Gharbi',
    phone: '+216 98 765 432',
    role: 'transporter',
    rating: 4.6,
    totalRatings: 21,
    createdAt: '2025-10-02T10:00:00.000Z',
    identityStatus: 'verified',
  },
  {
    id: 'u-transporter-3',
    email: 'sami@demo.com',
    firstName: 'Sami',
    lastName: 'Jlassi',
    phone: '+216 55 321 654',
    role: 'transporter',
    rating: 4.9,
    totalRatings: 48,
    createdAt: '2025-08-11T10:00:00.000Z',
    identityStatus: 'verified',
  },
];

// ── Shipment 1 — Paris → Tunis, petit colis, en transit ─────────────────

const s1Tracking: TrackingEvent[] = [
  {
    id: 'te-1-1',
    status: 'pending',
    description: "Envoi créé et publié par l'expéditeur",
    location: 'Paris, France',
    timestamp: '2026-06-24T09:15:00.000Z',
  },
  {
    id: 'te-1-2',
    status: 'accepted',
    description: 'Pris en charge par Karim Trabelsi',
    location: 'Paris, France',
    timestamp: '2026-06-24T14:40:00.000Z',
  },
  {
    id: 'te-1-3',
    status: 'collected',
    description: "Colis récupéré à l'adresse de collecte",
    location: '15 Rue de la Roquette, Paris',
    timestamp: '2026-06-27T10:05:00.000Z',
  },
  {
    id: 'te-1-4',
    status: 'in_transit',
    description: 'Embarqué sur le ferry Corsica Linea — Marseille → Tunis',
    location: 'Port de Marseille',
    timestamp: '2026-06-29T18:30:00.000Z',
  },
];

// ── Shipment 2 — Lyon → Sousse, gros objet, enchères ─────────────────────

const s2Bids: Bid[] = [
  {
    id: 'bid-2-1',
    transporterId: 'u-transporter-1',
    transporterName: 'Karim Trabelsi',
    transporterRating: 4.8,
    shipmentId: 's-2',
    price: 85,
    estimatedDelivery: '2026-07-12T12:00:00.000Z',
    message: 'Je pars de Lyon le 8 juillet, fourgon spacieux, vélo bien protégé.',
    createdAt: '2026-06-28T11:20:00.000Z',
    status: 'pending',
  },
  {
    id: 'bid-2-2',
    transporterId: 'u-transporter-2',
    transporterName: 'Mehdi Gharbi',
    transporterRating: 4.6,
    shipmentId: 's-2',
    price: 95,
    estimatedDelivery: '2026-07-10T12:00:00.000Z',
    message: 'Livraison rapide, je passe par Sousse directement.',
    createdAt: '2026-06-28T16:45:00.000Z',
    status: 'pending',
  },
  {
    id: 'bid-2-3',
    transporterId: 'u-transporter-3',
    transporterName: 'Sami Jlassi',
    transporterRating: 4.9,
    shipmentId: 's-2',
    price: 75,
    estimatedDelivery: '2026-07-14T12:00:00.000Z',
    createdAt: '2026-06-29T09:10:00.000Z',
    status: 'pending',
  },
];

// ── Shipment 3 — Marseille → Sfax, petit colis, livré ────────────────────

const s3Tracking: TrackingEvent[] = [
  {
    id: 'te-3-1',
    status: 'pending',
    description: "Envoi créé et publié par l'expéditeur",
    location: 'Marseille, France',
    timestamp: '2026-06-05T08:00:00.000Z',
  },
  {
    id: 'te-3-2',
    status: 'accepted',
    description: 'Pris en charge par Karim Trabelsi',
    location: 'Marseille, France',
    timestamp: '2026-06-05T13:30:00.000Z',
  },
  {
    id: 'te-3-3',
    status: 'collected',
    description: "Colis récupéré à l'adresse de collecte",
    location: '8 Boulevard National, Marseille',
    timestamp: '2026-06-07T09:45:00.000Z',
  },
  {
    id: 'te-3-4',
    status: 'in_transit',
    description: 'Embarqué sur le ferry CTN — Marseille → Tunis',
    location: 'Port de Marseille',
    timestamp: '2026-06-08T19:00:00.000Z',
  },
  {
    id: 'te-3-5',
    status: 'arrived',
    description: 'Arrivé au port de La Goulette, en route vers Sfax',
    location: 'Tunis, Tunisie',
    timestamp: '2026-06-09T20:15:00.000Z',
  },
  {
    id: 'te-3-6',
    status: 'delivered',
    description: 'Colis livré au destinataire',
    location: 'Route de Gabès Km 3, Sfax',
    timestamp: '2026-06-10T15:20:00.000Z',
  },
];

export const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: 's-1',
    senderId: 'u-sender-1',
    senderName: 'Amine Ben Salah',
    transporterId: 'u-transporter-1',
    transporterName: 'Karim Trabelsi',
    type: 'small',
    status: 'in_transit',
    weight: 12,
    price: 48,
    items: [
      { name: 'Vêtements', category: 'Textile', quantity: 2, weight: 5 },
      { name: 'Cosmétiques', category: 'Beauté', quantity: 1, weight: 2 },
      { name: 'Alimentation', category: 'Épicerie', quantity: 3, weight: 5 },
    ],
    pickupAddress: {
      street: '15 Rue de la Roquette',
      city: 'Paris',
      postalCode: '75011',
      country: 'France',
      contactName: 'Amine Ben Salah',
      contactPhone: '+33 6 12 34 56 78',
      ...CITY_COORDS.Paris,
    },
    deliveryAddress: {
      street: '24 Avenue Habib Bourguiba',
      city: 'Tunis',
      postalCode: '1001',
      country: 'Tunisie',
      contactName: 'Fatma Ben Salah',
      contactPhone: '+216 22 345 678',
      ...CITY_COORDS.Tunis,
    },
    createdAt: '2026-06-24T09:15:00.000Z',
    collectedAt: '2026-06-27T10:05:00.000Z',
    trackingHistory: s1Tracking,
  },
  {
    id: 's-2',
    senderId: 'u-sender-1',
    senderName: 'Amine Ben Salah',
    type: 'large',
    status: 'pending',
    description:
      'Vélo électrique (VTT) en très bon état, batterie retirée et emballée séparément. Prévoir sangles pour le maintien.',
    dimensions: '180 × 60 × 100 cm',
    pickupAddress: {
      street: '42 Cours Gambetta',
      city: 'Lyon',
      postalCode: '69007',
      country: 'France',
      contactName: 'Amine Ben Salah',
      contactPhone: '+33 6 12 34 56 78',
      ...CITY_COORDS.Lyon,
    },
    deliveryAddress: {
      street: '12 Avenue Léopold Senghor',
      city: 'Sousse',
      postalCode: '4000',
      country: 'Tunisie',
      contactName: 'Hichem Ben Salah',
      contactPhone: '+216 98 112 233',
      ...CITY_COORDS.Sousse,
    },
    createdAt: '2026-06-27T17:00:00.000Z',
    trackingHistory: [
      {
        id: 'te-2-1',
        status: 'pending',
        description: "Envoi créé — en attente d'offres de transporteurs",
        location: 'Lyon, France',
        timestamp: '2026-06-27T17:00:00.000Z',
      },
    ],
    bids: s2Bids,
  },
  {
    id: 's-3',
    senderId: 'u-sender-1',
    senderName: 'Amine Ben Salah',
    transporterId: 'u-transporter-1',
    transporterName: 'Karim Trabelsi',
    type: 'small',
    status: 'delivered',
    weight: 8,
    price: 32,
    items: [
      { name: 'Médicaments', category: 'Santé', quantity: 1, weight: 1 },
      { name: 'Jouets enfants', category: 'Loisirs', quantity: 2, weight: 3 },
      { name: 'Café & thé', category: 'Épicerie', quantity: 2, weight: 4 },
    ],
    pickupAddress: {
      street: '8 Boulevard National',
      city: 'Marseille',
      postalCode: '13001',
      country: 'France',
      contactName: 'Amine Ben Salah',
      contactPhone: '+33 6 12 34 56 78',
      ...CITY_COORDS.Marseille,
    },
    deliveryAddress: {
      street: 'Route de Gabès Km 3',
      city: 'Sfax',
      postalCode: '3000',
      country: 'Tunisie',
      contactName: 'Leila Masmoudi',
      contactPhone: '+216 55 667 788',
      ...CITY_COORDS.Sfax,
    },
    createdAt: '2026-06-05T08:00:00.000Z',
    collectedAt: '2026-06-07T09:45:00.000Z',
    deliveredAt: '2026-06-10T15:20:00.000Z',
    trackingHistory: s3Tracking,
  },
];

// ── Routes (transporteur démo = Karim) ───────────────────────────────────

export const MOCK_ROUTES: Route[] = [
  {
    id: 'r-1',
    transporterId: 'u-transporter-1',
    departureCity: 'Marseille',
    departureCountry: 'France',
    arrivalCity: 'Tunis',
    arrivalCountry: 'Tunisie',
    departureDate: '2026-07-08T20:00:00.000Z',
    estimatedArrivalDate: '2026-07-09T18:00:00.000Z',
    availableCapacity: 45,
    ferryCompany: 'Corsica Linea',
  },
  {
    id: 'r-2',
    transporterId: 'u-transporter-1',
    departureCity: 'Marseille',
    departureCountry: 'France',
    arrivalCity: 'Tunis',
    arrivalCountry: 'Tunisie',
    departureDate: '2026-07-15T19:30:00.000Z',
    estimatedArrivalDate: '2026-07-16T17:30:00.000Z',
    availableCapacity: 60,
    ferryCompany: 'CTN',
  },
  {
    id: 'r-3',
    transporterId: 'u-transporter-1',
    departureCity: 'Sète',
    departureCountry: 'France',
    arrivalCity: 'Tunis',
    arrivalCountry: 'Tunisie',
    departureDate: '2026-07-22T21:00:00.000Z',
    estimatedArrivalDate: '2026-07-23T20:00:00.000Z',
    availableCapacity: 30,
    ferryCompany: 'GNV',
  },
  {
    id: 'r-4',
    transporterId: 'u-transporter-2',
    departureCity: 'Marseille',
    departureCountry: 'France',
    arrivalCity: 'Tunis',
    arrivalCountry: 'Tunisie',
    departureDate: '2026-07-10T20:00:00.000Z',
    estimatedArrivalDate: '2026-07-11T18:00:00.000Z',
    availableCapacity: 55,
    ferryCompany: 'CTN',
  },
];

// ── Conversations & messages ─────────────────────────────────────────────

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'm-1',
    conversationId: 'c-1',
    senderId: 'u-sender-1',
    text: 'Bonjour Karim, le colis est bien emballé, 3 sacs au total.',
    timestamp: '2026-06-26T09:00:00.000Z',
    read: true,
  },
  {
    id: 'm-2',
    conversationId: 'c-1',
    senderId: 'u-transporter-1',
    text: 'Parfait ! Je passe le récupérer demain matin vers 10h.',
    timestamp: '2026-06-26T09:12:00.000Z',
    read: true,
  },
  {
    id: 'm-3',
    conversationId: 'c-1',
    senderId: 'u-transporter-1',
    text: 'Colis embarqué sur le ferry, tout est en ordre 👍',
    timestamp: '2026-06-29T18:45:00.000Z',
    read: false,
  },
  {
    id: 'm-4',
    conversationId: 'c-2',
    senderId: 'u-transporter-2',
    text: "Bonjour, je peux prendre le vélo électrique. Il est démontable ?",
    timestamp: '2026-06-28T17:00:00.000Z',
    read: true,
  },
  {
    id: 'm-5',
    conversationId: 'c-2',
    senderId: 'u-sender-1',
    text: 'Bonjour, oui la roue avant se retire et la batterie est à part.',
    timestamp: '2026-06-28T17:25:00.000Z',
    read: true,
  },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c-1',
    participants: ['u-sender-1', 'u-transporter-1'],
    participantNames: {
      'u-sender-1': 'Amine Ben Salah',
      'u-transporter-1': 'Karim Trabelsi',
    },
    shipmentId: 's-1',
    lastMessage: MOCK_MESSAGES[2],
    unreadCount: 1,
    updatedAt: '2026-06-29T18:45:00.000Z',
  },
  {
    id: 'c-2',
    participants: ['u-sender-1', 'u-transporter-2'],
    participantNames: {
      'u-sender-1': 'Amine Ben Salah',
      'u-transporter-2': 'Mehdi Gharbi',
    },
    shipmentId: 's-2',
    lastMessage: MOCK_MESSAGES[4],
    unreadCount: 0,
    updatedAt: '2026-06-28T17:25:00.000Z',
  },
];
