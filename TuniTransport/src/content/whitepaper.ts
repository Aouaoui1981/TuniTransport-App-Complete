// ──────────────────────────────────────────────────────────────────────────
// THL — contenu du Livre blanc (rendu par WhitePaperScreen)
// Version mobile du document de référence : problème, solution, état du
// produit, modèle économique, marché, feuille de route, risques et vision.
// ──────────────────────────────────────────────────────────────────────────

export type PhaseStatus = 'done' | 'now' | 'plan';

export interface CapabilityRow {
  label: string;
  status: PhaseStatus;
  detail: string;
}

export interface RoadmapPhase {
  name: string;
  when: string;
  status: PhaseStatus;
  items: string[];
}

export interface RiskRow {
  risk: string;
  answer: string;
}

export const WHITEPAPER = {
  version: '1.0',
  date: 'Juillet 2026',
  headline: 'Le transport collaboratif de colis entre la France et la Tunisie',
  intro:
    "THL met en relation les particuliers qui souhaitent envoyer un colis vers la Tunisie et les voyageurs qui traversent en ferry avec de la capacité disponible — un tarif simple, une identité vérifiée, un paiement sécurisé.",

  stats: [
    { value: '4 €/kg', label: 'Tarif fixe — effets personnels' },
    { value: '100 %', label: 'Transporteurs vérifiés (KYC)' },
    { value: 'FR ⇄ TN', label: 'Corridor de lancement' },
  ],

  problem: {
    kicker: '01 · Le problème',
    title: 'Un besoin massif, des réponses inadaptées',
    paragraphs: [
      "La communauté tunisienne établie en France se compte en centaines de milliers de personnes. Le lien avec le pays passe très concrètement par les colis : vêtements, médicaments, cadeaux, pièces détachées, produits introuvables sur place.",
      "Aujourd'hui, trois options s'offrent à l'expéditeur, toutes imparfaites :",
    ],
    bullets: [
      "Le fret express international — fiable mais coûteux, souvent plusieurs dizaines d'euros pour quelques kilos.",
      "Les transporteurs informels — trouvés sur les réseaux sociaux : sans vérification d'identité, sans paiement sécurisé, sans recours en cas de litige.",
      "Attendre son propre voyage — c'est-à-dire ne pas envoyer du tout.",
    ],
    closing:
      "Côté offre, chaque traversée en ferry (Marseille, Gênes → Tunis) embarque des voyageurs avec des franchises bagages considérables. Cette capacité existe déjà, elle est payée, et elle voyage à vide.",
  },

  solution: {
    kicker: '02 · La solution',
    title: 'Une place de marché sécurisée, de bout en bout',
    forSender: [
      "Publication d'un envoi en quelques minutes : poids, contenu, adresses.",
      "Tarif transparent : 4 €/kg pour les effets personnels ; prix librement convenu pour les objets hors gabarit.",
      "Paiement par carte bancaire ou en espèces à la remise du colis.",
      "Étiquette imprimable avec QR code contenant toutes les informations de l'envoi.",
      "Suivi étape par étape et messagerie intégrée avec le transporteur.",
    ],
    forTransporter: [
      "Monétisation de la capacité inutilisée d'un trajet déjà prévu.",
      "Liste des envois disponibles filtrée par trajet, acceptation en un geste.",
      "Profil public avec évaluations et badge d'identité vérifiée.",
    ],
    legal:
      "THL est un intermédiaire technique : la plateforme met en relation un expéditeur et un transporteur indépendant. Le contrat de transport est conclu directement entre ces deux parties. THL n'est ni transporteur, ni commissionnaire de transport.",
  },

  capabilities: [
    {
      label: 'Application web complète',
      status: 'done',
      detail: "Parcours expéditeur et transporteur de bout en bout, accessible depuis tout navigateur.",
    },
    {
      label: 'Comptes & base de données sécurisée',
      status: 'done',
      detail: "Authentification, données isolées par utilisateur, colonnes financières verrouillées côté serveur.",
    },
    {
      label: "Vérification d'identité (KYC)",
      status: 'done',
      detail: "Dépôt de pièce d'identité, revue manuelle par l'équipe THL dans l'application.",
    },
    {
      label: 'Paiement en espèces à la remise',
      status: 'done',
      detail: "Confirmation de réservation, tracée dans le suivi de l'envoi.",
    },
    {
      label: 'Paiement par carte (Stripe)',
      status: 'done',
      detail: "Paiements réels activés (Stripe en mode production). Le règlement est encaissé de façon sécurisée et débloqué au transporteur après confirmation de la livraison.",
    },
    {
      label: "Étiquette d'expédition + QR code",
      status: 'done',
      detail: "Le QR contient poids, contenu, expéditeur, destinataire et transporteur.",
    },
    {
      label: 'Applications iOS / Android natives',
      status: 'plan',
      detail: "Le code est déjà multiplateforme ; la publication sur les stores est planifiée.",
    },
    {
      label: 'Versement des gains aux transporteurs',
      status: 'now',
      detail: "Le transporteur enregistre ses coordonnées bancaires et demande le retrait de ses gains disponibles depuis l'application. Le reversement 100 % automatique via Stripe Connect est la prochaine étape.",
    },
  ] as CapabilityRow[],

  businessModel: {
    kicker: '04 · Modèle économique',
    title: 'Simple, aligné sur la valeur créée',
    paragraphs: [
      "Le revenu de THL provient d'une commission de service prélevée sur chaque transaction réglée via la plateforme (fourchette cible : 10 à 15 %), avec un principe simple : la plateforme ne gagne de l'argent que lorsqu'un colis voyage réellement.",
    ],
    bullets: [
      "Colis standard — tarif fixe au poids (4 €/kg) : lisible pour l'expéditeur, prévisible pour le transporteur.",
      "Objets hors gabarit — prix libre convenu entre les parties : la plateforme capte la valeur des envois à panier élevé.",
      "À moyen terme : mise en avant d'annonces, assurance colis optionnelle, offre entreprise.",
    ],
  },

  market: {
    kicker: '05 · Marché & potentiel',
    title: "Jusqu'où ce projet peut aller",
    circles: [
      {
        name: 'Cercle 1 — Le corridor France ⇄ Tunisie',
        body: "Une diaspora de plusieurs centaines de milliers de personnes, des flux de colis constants toute l'année, et des lignes maritimes régulières (Marseille et Gênes vers Tunis) qui assurent une capacité récurrente et prévisible.",
      },
      {
        name: "Cercle 2 — L'Europe vers la Tunisie",
        body: "Les communautés tunisiennes d'Italie, d'Allemagne, de Belgique et de Suisse présentent le même besoin, avec les mêmes ferries au départ de Gênes. L'extension est une question de couverture, pas de produit.",
      },
      {
        name: 'Cercle 3 — Le Maghreb et au-delà',
        body: "L'Algérie et le Maroc partagent la même structure de marché. À terme, THL a vocation à devenir la plateforme de référence du transport collaboratif entre l'Europe et le Maghreb.",
      },
    ],
    method:
      "Par honnêteté, ce document ne cite pas de chiffres de marché précis tant qu'ils ne sont pas sourcés par une étude dédiée. L'évaluation rigoureuse du volume adressable fait partie de la phase de lancement.",
  },

  roadmap: [
    {
      name: 'Phase 0 — Construire le socle',
      when: '2025 → mi-2026',
      status: 'done',
      items: [
        "Application web complète en production (expéditeur, transporteur, administrateur).",
        "Infrastructure sécurisée : authentification, isolation des données, paiements Stripe en production.",
        "Vérification d'identité, étiquette QR, paiement en espèces, messagerie, suivi.",
        "Identité de marque THL et refonte professionnelle de l'interface.",
      ],
    },
    {
      name: 'Phase 1 — Lancement commercial',
      when: 'T3 2026',
      status: 'now',
      items: [
        "Paiements réels activés (Stripe en mode production) — première transaction réussie.",
        "Nom de domaine propre et adresse e-mail professionnelle.",
        "Premiers utilisateurs réels sur les communautés de la diaspora, avec accompagnement rapproché.",
        "Mesure systématique : taux de complétion, litiges, satisfaction.",
      ],
    },
    {
      name: 'Phase 2 — Mobile & automatisation',
      when: 'T4 2026 → T1 2027',
      status: 'plan',
      items: [
        "Publication sur Google Play puis l'App Store.",
        "Notifications push (nouvel envoi, colis accepté, paiement reçu).",
        "Stripe Connect : reversement automatique de la part du transporteur.",
        "Assurance colis optionnelle (partenariat assureur).",
      ],
    },
    {
      name: 'Phase 3 — Densifier le corridor',
      when: '2027',
      status: 'plan',
      items: [
        "Points de dépôt et de retrait partenaires dans les grandes villes françaises et tunisiennes.",
        "Partenariats avec les compagnies maritimes et agences spécialisées.",
        "Ouverture des départs depuis l'Italie, l'Allemagne et la Belgique.",
        "Offre dédiée aux petits commerçants.",
      ],
    },
    {
      name: 'Phase 4 — Le réseau Europe ⇄ Maghreb',
      when: '2028 →',
      status: 'plan',
      items: [
        "Extension aux corridors Algérie et Maroc.",
        "Groupage : consolidation de plusieurs envois sur un même trajet.",
        "API pour les partenaires (e-commerce de la diaspora).",
      ],
    },
  ] as RoadmapPhase[],

  risks: [
    {
      risk: 'Réglementaire & douanier',
      answer:
        "Positionnement d'intermédiaire technique, liste d'objets interdits opposable, déclaration sur l'honneur du caractère non commercial, accompagnement juridique prévu.",
    },
    {
      risk: 'Confiance & fraude',
      answer:
        "KYC obligatoire des transporteurs, paiement tracé, historique et évaluations publics, traçabilité complète de chaque envoi.",
    },
    {
      risk: 'Saisonnalité des traversées',
      answer: "Diversification des corridors (phase 3) et groupage (phase 4) pour lisser les volumes.",
    },
    {
      risk: 'Concurrence',
      answer:
        "Différenciation par la sécurité (KYC + paiement tracé) et l'expérience produit ; l'informel est le principal « concurrent », et c'est précisément lui que THL structure.",
    },
    {
      risk: 'Paiement hors plateforme (espèces)',
      answer:
        "Assumé au lancement pour lever la barrière de confiance ; le reversement automatique (phase 2) rendra le paiement en ligne plus avantageux pour les deux parties.",
    },
  ] as RiskRow[],

  vision: {
    kicker: '08 · Vision',
    title: 'Structurer ce qui existe déjà',
    paragraphs: [
      "Les colis voyagent déjà entre la France et la Tunisie — dans des coffres de voiture, confiés à des inconnus, sans trace ni recours. THL ne crée pas ce flux : il lui donne un cadre, une sécurité et une dignité.",
      "À cinq ans, l'ambition est de faire de THL l'infrastructure de confiance du transport collaboratif entre l'Europe et le Maghreb : chaque colis vérifié, payé, tracé — et chaque trajet en ferry transformé en opportunité économique pour celui qui l'effectue.",
    ],
  },

  disclaimer:
    "Document d'information. Il ne constitue ni une offre de titres financiers, ni un conseil en investissement. Les éléments prospectifs (feuille de route, fourchettes de commission) sont des objectifs susceptibles d'évoluer.",
} as const;
