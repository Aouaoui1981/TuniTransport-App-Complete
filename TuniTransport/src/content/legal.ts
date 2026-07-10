// ──────────────────────────────────────────────────────────────────────────
// THL — contenu des pages légales et informatives
//
// Six pages statiques rendues par LegalPageScreen. Les trois pages "terms",
// "prohibited" et "disclaimer" font l'objet d'un consentement obligatoire
// (checkbox) avant toute publication d'envoi (expéditeur) et avant toute
// offre ou prise en charge (transporteur) — voir <LegalConsent />.
// ──────────────────────────────────────────────────────────────────────────
import { Ionicons } from '@expo/vector-icons';

export type LegalPageKey =
  | 'terms'
  | 'privacy'
  | 'prohibited'
  | 'disclaimer'
  | 'about'
  | 'contact';

export interface LegalSection {
  heading?: string;
  body?: string;
  bullets?: string[];
}

export interface LegalPage {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  updatedAt: string; // affiché en pied de page
  intro: string;
  sections: LegalSection[];
}

export const SUPPORT_EMAIL = 'support@tunitransport.app';

export const LEGAL_PAGES: Record<LegalPageKey, LegalPage> = {
  // ── Conditions générales ────────────────────────────────────────────────
  terms: {
    title: 'Conditions générales',
    icon: 'document-text-outline',
    updatedAt: 'Juillet 2026',
    intro:
      "Les présentes conditions encadrent l'utilisation de THL, plateforme de mise en relation entre expéditeurs et transporteurs pour l'acheminement de bagages et d'objets entre la France et la Tunisie. En créant un compte, vous acceptez ces conditions dans leur intégralité.",
    sections: [
      {
        heading: '1. Rôle de la plateforme',
        body:
          "THL est un intermédiaire technique : la plateforme met en relation un expéditeur et un transporteur indépendant. Le contrat de transport est conclu directement entre ces deux parties. THL n'est ni transporteur, ni commissionnaire de transport.",
      },
      {
        heading: '2. Tarification des envois',
        bullets: [
          'Colis standard : tarif fixe de 4 € par kilogramme. Ce tarif est strictement réservé aux effets personnels et bagages ordinaires sans caractère commercial.',
          "Objets hors gabarit (réfrigérateurs, téléviseurs, vélos, vélos électriques, pièces automobiles, bagages volumineux…) : le prix est fixé par accord personnalisé — soit par entente directe entre l'expéditeur et le transporteur via la messagerie interne, soit par un devis proposé par le transporteur, négociable par l'expéditeur avant acceptation.",
          "Tout envoi à caractère commercial est exclu du tarif au poids et peut être refusé ou requalifié par le transporteur.",
        ],
      },
      {
        heading: "3. Obligations de l'expéditeur",
        bullets: [
          "Déclarer avec exactitude le contenu, le poids et les dimensions de l'envoi.",
          "Certifier, avant chaque publication, que l'envoi ne contient aucun objet interdit et n'a pas de caractère commercial (pour le tarif au poids).",
          "Remettre un envoi correctement emballé et accessible aux vérifications du transporteur.",
          'Accepter les Conditions générales et la Décharge de responsabilité avant toute publication (case à cocher obligatoire).',
        ],
      },
      {
        heading: '4. Obligations du transporteur',
        bullets: [
          "Faire vérifier son identité avant toute prise en charge d'envoi.",
          "Transporter les envois avec soin et respecter les délais annoncés.",
          'Respecter la réglementation douanière et les lois des pays traversés.',
          "Refuser tout envoi manifestement interdit ou non conforme à la déclaration.",
          'Accepter les Conditions générales et la Décharge de responsabilité avant toute offre ou prise en charge (case à cocher obligatoire).',
        ],
      },
      {
        heading: '5. Paiement',
        body:
          "Le paiement s'effectue via la plateforme. Le montant correspond au tarif au poids (colis standard) ou au prix convenu entre les parties (objet hors gabarit). Une commission de service peut être prélevée sur chaque transaction.",
      },
      {
        heading: '6. Manquements et sanctions',
        body:
          "Toute fausse déclaration, tentative de fraude ou envoi d'objets interdits peut entraîner l'annulation de l'envoi, la suspension ou la suppression du compte, et le signalement aux autorités compétentes.",
      },
    ],
  },

  // ── Politique de confidentialité ────────────────────────────────────────
  privacy: {
    title: 'Politique de confidentialité',
    icon: 'shield-checkmark-outline',
    updatedAt: 'Juillet 2026',
    intro:
      "THL protège vos données personnelles et ne les utilise que pour fournir le service. Cette politique décrit ce que nous collectons, pourquoi, et vos droits.",
    sections: [
      {
        heading: '1. Données collectées',
        bullets: [
          "Identité et contact : nom, prénom, e-mail, téléphone.",
          "Vérification d'identité (KYC) : document officiel transmis lors de la vérification.",
          "Données d'envoi : adresses de collecte et de livraison, contenu déclaré, photos éventuelles.",
          'Position GPS du transporteur pendant le transport (suivi en temps réel uniquement).',
          'Messages échangés via la messagerie interne.',
        ],
      },
      {
        heading: '2. Finalités',
        bullets: [
          'Mise en relation, suivi des envois et paiement sécurisé.',
          'Vérification d’identité et prévention de la fraude.',
          'Assistance et résolution des litiges.',
        ],
      },
      {
        heading: '3. Partage',
        body:
          "Vos données ne sont jamais vendues. Elles ne sont partagées qu'avec : l'autre partie de l'envoi (coordonnées nécessaires à la collecte et à la livraison), notre prestataire de paiement, et les autorités si la loi l'exige.",
      },
      {
        heading: '4. Vos droits',
        body:
          "Vous pouvez accéder à vos données, les rectifier ou demander leur suppression à tout moment depuis votre profil ou en écrivant à " +
          SUPPORT_EMAIL +
          ". Les données sont conservées uniquement le temps nécessaire au service et aux obligations légales.",
      },
    ],
  },

  // ── Objets interdits ────────────────────────────────────────────────────
  prohibited: {
    title: 'Objets interdits',
    icon: 'ban-outline',
    updatedAt: 'Juillet 2026',
    intro:
      "Les objets suivants ne peuvent en aucun cas être confiés ou transportés via THL, pour des raisons légales, douanières et de sécurité. Le transporteur est en droit de refuser tout envoi suspect.",
    sections: [
      {
        heading: 'Strictement interdits',
        bullets: [
          'Armes, munitions, explosifs et leurs composants.',
          'Stupéfiants et substances illicites.',
          'Matières dangereuses : produits inflammables, toxiques, corrosifs, bouteilles de gaz, artifices.',
          'Contrefaçons et marchandises volées.',
          "Espèces (argent liquide), métaux précieux et titres au porteur.",
          "Documents d'identité de tiers.",
          'Animaux vivants.',
          'Médicaments sans ordonnance nominative.',
          'Tabac et alcool au-delà des franchises douanières autorisées.',
          'Denrées périssables sans emballage adapté au délai de transport.',
        ],
      },
      {
        heading: 'Rappel',
        body:
          "L'expéditeur certifie à chaque envoi qu'il ne contient aucun objet interdit. En cas de doute sur un objet, contactez le support avant de publier votre envoi. Toute infraction engage la responsabilité exclusive de l'expéditeur.",
      },
    ],
  },

  // ── Décharge de responsabilité ──────────────────────────────────────────
  disclaimer: {
    title: 'Décharge de responsabilité',
    icon: 'alert-circle-outline',
    updatedAt: 'Juillet 2026',
    intro:
      "L'acceptation de cette décharge est une étape obligatoire pour l'expéditeur comme pour le transporteur avant toute opération d'envoi.",
    sections: [
      {
        heading: '1. Nature du service',
        body:
          "THL est une plateforme de mise en relation. Le contrat de transport lie exclusivement l'expéditeur et le transporteur. THL n'intervient pas dans l'exécution du transport.",
      },
      {
        heading: '2. Limites de responsabilité',
        bullets: [
          "THL ne peut être tenue responsable de la perte, du vol, de la casse ou du retard d'un envoi.",
          "Les contrôles, taxes et saisies douanières relèvent de la responsabilité des parties.",
          "L'exactitude des déclarations (contenu, poids, valeur) relève de la seule responsabilité de l'expéditeur.",
          "L'assurance éventuelle des biens transportés relève de l'initiative des parties.",
        ],
      },
      {
        heading: '3. Consentement obligatoire',
        body:
          "Avant de publier un envoi (expéditeur) ou de faire une offre / prendre en charge un envoi (transporteur), chaque partie doit cocher la case d'acceptation des Conditions générales, de la liste des Objets interdits et de la présente Décharge. Sans cette acceptation, l'opération est bloquée.",
      },
    ],
  },

  // ── À propos ────────────────────────────────────────────────────────────
  about: {
    title: 'À propos de nous',
    icon: 'information-circle-outline',
    updatedAt: 'Juillet 2026',
    intro:
      "THL connecte la diaspora tunisienne : les voyageurs et transporteurs qui font la route entre la France et la Tunisie transportent les colis de ceux qui en ont besoin.",
    sections: [
      {
        heading: 'Notre mission',
        body:
          "Rendre l'envoi de bagages et d'objets entre les deux rives simple, économique et transparent : un tarif clair de 4 €/kg pour les colis personnels, et la liberté de négocier pour les objets volumineux.",
      },
      {
        heading: 'Nos engagements',
        bullets: [
          'Identités vérifiées pour les transporteurs.',
          'Paiement sécurisé via la plateforme.',
          'Suivi des envois en temps réel.',
          'Messagerie intégrée pour un accord direct et transparent.',
        ],
      },
    ],
  },

  // ── Contact ─────────────────────────────────────────────────────────────
  contact: {
    title: 'Nous contacter',
    icon: 'mail-outline',
    updatedAt: 'Juillet 2026',
    intro:
      "Une question, un litige ou un doute sur un objet à envoyer ? Notre équipe support vous répond rapidement.",
    sections: [
      {
        heading: 'Support',
        bullets: [
          'E-mail : ' + SUPPORT_EMAIL,
          'Réponse sous 24 h ouvrées.',
          "Depuis l'application : Profil → Aide & Support.",
        ],
      },
      {
        heading: 'Urgences envoi',
        body:
          "Pour un problème sur un envoi en cours (retard, litige à la livraison), contactez d'abord l'autre partie via la messagerie interne, puis le support si le désaccord persiste — l'historique des messages nous aide à trancher.",
      },
    ],
  },
};
