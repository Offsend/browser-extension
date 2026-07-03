import type { Messages } from './en';

const values = (n: number): string => (n === 1 ? 'valeur' : 'valeurs');

export const fr: Messages = {
  type: {
    email: 'email',
    phone: 'téléphone',
    api_key: 'clé API',
    token: 'jeton',
    private_key: 'clé privée',
    credit_card: 'carte',
    iban: 'IBAN',
    ip_address: 'IP',
    uuid: 'UUID',
    secret: 'secret',
    custom: 'personnalisé',
  },

  typeName: {
    email: 'Adresses e-mail',
    phone: 'Numéros de téléphone',
    api_key: 'Clés API',
    token: 'Jetons',
    private_key: 'Clés privées',
    credit_card: 'Cartes bancaires',
    iban: 'IBAN',
    ip_address: 'Adresses IP',
    uuid: 'UUID',
    secret: 'Secrets génériques',
    custom: 'Règles personnalisées',
  },

  overlay: {
    sensitiveFound: (n) => `${n} ${values(n)} sensible${n === 1 ? '' : 's'} trouvée${n === 1 ? '' : 's'}`,
    maskAndSend: 'Masquer et envoyer',
    sendAnyway: 'Envoyer quand même',
    maskAndAttach: 'Masquer et joindre',
    attachAnyway: 'Joindre quand même',
    cancel: 'Annuler',
    liveChip: (summary) => `${summary} — sera masqué à l'envoi`,
  },

  toast: {
    masked: (n) => `${n} ${values(n)} masquée${n === 1 ? '' : 's'}`,
    maskedInAttachment: (n) => `${n} ${values(n)} masquée${n === 1 ? '' : 's'} dans la pièce jointe`,
    restored: (n) => `${n} ${values(n)} restaurée${n === 1 ? '' : 's'}`,
    nothingToRestore: 'Rien à restaurer',
    maskingFailed: 'Échec du masquage — message non envoyé',
    restoreAction: 'Restaurer',
  },

  health: {
    protectionPaused: 'Protection en pause',
    promptInputNotFound: 'Champ de saisie introuvable',
    sendButtonNotFound: "Bouton d'envoi introuvable",
  },

  badge: {
    inactive: 'Offsend — inactif sur ce site',
    preparing: 'Offsend — préparation…',
    active: 'Offsend — actif et protège',
  },

  popup: {
    localOnly: 'Local uniquement',
    on: 'Activé',
    off: 'Désactivé',
    site: 'Site',
    adapter: 'Adaptateur',
    mode: 'Mode',
    notSupported: 'non pris en charge',
    connecting: 'connexion…',
    degraded: 'dégradé',
    paused: 'en pause',
    active: 'actif',
    protectionIncomplete: (reason) => `${reason} — la protection peut être incomplète.`,
    settings: 'Paramètres',
    footer: 'Le contenu ne quitte jamais votre appareil.',
  },

  mode: {
    warn: 'Avertir',
    'auto-mask': 'Masquage auto',
    block: 'Bloquer',
  },

  options: {
    loading: 'Chargement…',
    title: 'Paramètres',
    localOnly: 'Local uniquement',
    modeTitle: 'Mode',
    modeHint: "Comment Offsend réagit lorsqu'il détecte des données sensibles dans un prompt.",
    modeWarnHint: "Examiner les détections avant l'envoi. (Par défaut)",
    modeAutoMaskHint: 'Masquer et envoyer, puis afficher une notification discrète.',
    modeBlockHint: "L'envoi est bloqué tant que les valeurs sensibles ne sont pas masquées.",
    detectorsTitle: 'Détecteurs',
    detectorsHint: 'Choisissez quels types de valeurs sensibles Offsend analyse.',
    customRulesTitle: 'Règles personnalisées',
    customRulesHint:
      'Motifs regex JavaScript en plus des détecteurs intégrés. Activez « Règles personnalisées » sous Détecteurs pour les activer ou désactiver.',
    maskingTitle: 'Masquage',
    restoreWindow: 'Fenêtre de restauration',
    restoreWindowHint:
      'Durée de conservation des correspondances chiffrées pour restaurer les originaux.',
    minutes: 'min',
    privacyTitle: 'Confidentialité',
    privacyHint:
      "Offsend n'envoie jamais le contenu des prompts nulle part. Le seul signal optionnel est un ping anonyme « installation active » (sans contenu, détections ni sites) pour compter les utilisateurs actifs.",
    telemetryLabel: "Ping d'utilisation anonyme",
    telemetryHint: 'Envoie au plus un ping anonyme par jour. Désactivez pour ne rien envoyer.',
    allowlistTitle: 'Liste blanche',
    allowlistHint: 'Les hôtes listés ici ne sont jamais analysés. Un hôte par ligne.',
    resetDefaults: 'Réinitialiser les valeurs par défaut',
  },

  rules: {
    empty:
      "Aucune règle personnalisée pour l'instant. Ajoutez une expression régulière JavaScript pour des valeurs spécifiques à votre entreprise (sans",
    emptyDelimiters: 'délimiteurs).',
    edit: 'Modifier',
    addRule: 'Ajouter une règle',
    editRule: 'Modifier la règle',
    maxReached: (max) => `Maximum de ${max} règles atteint.`,
    name: 'Nom',
    pattern: 'Motif',
    flags: 'Flags',
    flagsHint: 'Facultatif. g est toujours appliqué. Exemple : i',
    removeRule: 'Supprimer la règle',
    cancel: 'Annuler',
    add: 'Ajouter',
    save: 'Enregistrer',
    error: {
      empty_id: 'Identifiant de règle manquant.',
      id_too_long: 'Identifiant trop long.',
      empty_name: 'Le nom est requis.',
      name_too_long: 'Nom trop long.',
      empty_pattern: 'Le motif est requis.',
      pattern_too_long: 'Motif trop long.',
      invalid_pattern: 'Expression régulière invalide.',
      unsafe_pattern: 'Le motif semble dangereux (quantificateurs imbriqués).',
      invalid_flags: 'Les flags doivent utiliser uniquement g, i, m, s, u ou y.',
      too_many_rules: 'Trop de règles.',
    },
    warning: {
      broad_pattern:
        "Ce motif peut correspondre à de larges portions de texte et masquer plus que prévu. Envisagez de l'ancrer (p. ex. \\b…\\b) ou d'ajouter des caractères littéraux.",
    },
  },
};
