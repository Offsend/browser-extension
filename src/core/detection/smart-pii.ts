import type { Detector } from './detectors';
import type { FindingType } from './types';

/** Categories the on-device Smart PII pass can emit. */
export const SMART_PII_TYPES = [
  'person',
  'organization',
  'address',
  'location',
] as const satisfies readonly FindingType[];

export interface SmartPiiSettings {
  readonly enabled: boolean;
  readonly person: boolean;
  readonly organization: boolean;
  readonly address: boolean;
  readonly location: boolean;
}

export const DEFAULT_SMART_PII: SmartPiiSettings = {
  enabled: false,
  person: true,
  organization: true,
  address: true,
  location: true,
};

const NAME_TOKEN = String.raw`\p{Lu}[\p{L}'’-]+`;
const ORG_SUFFIX =
  String.raw`Inc\.?|Incorporated|Corp\.?|Corporation|LLC|L\.L\.C\.|Ltd\.?|Limited|GmbH|AG|PLC|Company`;
const STREET_SUFFIX =
  String.raw`Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?|Way|Court|Ct\.?|Place|Pl\.?|Square|Plaza|Parkway|Pkwy\.?|Strasse|Straße|Platz`;

/** First tokens that make a Title-Case pair look like prose, not a name. */
const PERSON_FIRST_STOP = new Set([
  'a',
  'an',
  'the',
  'this',
  'that',
  'these',
  'those',
  'please',
  'prepare',
  'hello',
  'dear',
  'hi',
  'hey',
  'my',
  'your',
  'our',
  'their',
  'his',
  'her',
  'we',
  'you',
  'they',
  'in',
  'on',
  'at',
  'from',
  'to',
  'for',
  'with',
  'about',
  'after',
  'before',
  'new',
  'united',
  'north',
  'south',
  'east',
  'west',
  'machine',
  'artificial',
  'credit',
  'privacy',
  'open',
  'best',
  'kind',
  'thanks',
  'thank',
  'let',
  'make',
  'take',
  'give',
  'tell',
  'ask',
  'show',
  'write',
  'read',
  'call',
  'meet',
  'join',
  'see',
  'check',
  'update',
  'create',
  'build',
  'add',
  'remove',
  'delete',
  'click',
  'press',
  'enter',
  'message',
  'send',
  'mask',
  'review',
  'general',
  'senior',
  'chief',
  'international',
  'national',
  'central',
  'project',
  'client',
  'contract',
  'invoice',
  'appendix',
  'section',
  'chapter',
  'figure',
  'table',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]);

const PERSON_ANY_STOP = new Set([
  ...PERSON_FIRST_STOP,
  'learning',
  'intelligence',
  'states',
  'kingdom',
  'corporation',
  'company',
  'street',
  'avenue',
  'road',
  'boulevard',
  'drive',
  'lane',
  'team',
  'regards',
  'email',
]);

const PERSON_PHRASE_STOP = new Set([
  'kind regards',
  'best regards',
  'thank you',
  'dear team',
  'dear all',
  'hi team',
  'machine learning',
  'artificial intelligence',
  'credit card',
  'privacy test',
]);

const MULTI_WORD_PLACES = [
  'New York',
  'Los Angeles',
  'San Francisco',
  'San Diego',
  'Washington DC',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'South Korea',
  'Saudi Arabia',
  'Hong Kong',
  'New Zealand',
  'South Africa',
  'Czech Republic',
  'Silicon Valley',
  'Bay Area',
] as const;

const CONTEXT_PLACES = [
  'Paris',
  'London',
  'Berlin',
  'Tokyo',
  'Madrid',
  'Rome',
  'Amsterdam',
  'Dublin',
  'Prague',
  'Vienna',
  'Zurich',
  'Munich',
  'Hamburg',
  'Barcelona',
  'Lisbon',
  'Stockholm',
  'Oslo',
  'Copenhagen',
  'Helsinki',
  'Warsaw',
  'Budapest',
  'Athens',
  'Istanbul',
  'Dubai',
  'Singapore',
  'Seoul',
  'Beijing',
  'Shanghai',
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Sydney',
  'Melbourne',
  'Toronto',
  'Montreal',
  'Vancouver',
  'Chicago',
  'Boston',
  'Seattle',
  'Austin',
  'Denver',
  'Miami',
  'Atlanta',
  'Dallas',
  'Houston',
  'Phoenix',
  'Germany',
  'France',
  'Japan',
  'Italy',
  'Spain',
  'Brazil',
  'Australia',
  'Canada',
  'China',
  'India',
  'Mexico',
  'Poland',
  'Sweden',
  'Norway',
  'Finland',
  'Denmark',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Ireland',
  'Portugal',
  'Greece',
] as const;

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokens(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

export function isLikelyPerson(value: string): boolean {
  const parts = tokens(value);
  if (parts.length < 2 || parts.length > 3) return false;
  const phrase = value.toLowerCase();
  if (PERSON_PHRASE_STOP.has(phrase)) return false;
  if (MULTI_WORD_PLACES.some((place) => place.toLowerCase() === phrase)) return false;
  if (PERSON_FIRST_STOP.has(parts[0]!.toLowerCase())) return false;
  if (parts.some((part) => PERSON_ANY_STOP.has(part.toLowerCase().replace(/\.$/, '')))) {
    return false;
  }
  if (new RegExp(`^(?:${ORG_SUFFIX})$`, 'i').test(parts[parts.length - 1]!)) return false;
  if (new RegExp(`^(?:${STREET_SUFFIX})$`, 'i').test(parts[parts.length - 1]!)) return false;
  return true;
}

export function isLikelyOrganization(value: string): boolean {
  const parts = tokens(value);
  if (parts.length < 2) return false;
  return new RegExp(`^(?:${ORG_SUFFIX})$`, 'i').test(parts[parts.length - 1]!);
}

function personPattern(): RegExp {
  return new RegExp(String.raw`\b(${NAME_TOKEN}(?:\s+${NAME_TOKEN}){1,2})\b`, 'gu');
}

function organizationPattern(): RegExp {
  return new RegExp(
    String.raw`\b([\p{Lu}][\p{L}0-9&.'’-]*(?:\s+[\p{Lu}][\p{L}0-9&.'’-]*){0,4})\s+(?:${ORG_SUFFIX})\b`,
    'gu',
  );
}

function addressPattern(): RegExp {
  return new RegExp(
    String.raw`\b(\d{1,5}[A-Za-z]?\s+\p{Lu}[\p{L}.'-]+(?:\s+\p{Lu}[\p{L}.'-]+){0,4}\s+(?:${STREET_SUFFIX}))\b`,
    'gu',
  );
}

function locationPattern(): RegExp {
  const multi = MULTI_WORD_PLACES.map(escapeRe).join('|');
  const single = CONTEXT_PLACES.map(escapeRe).join('|');
  return new RegExp(
    String.raw`(?:(?<=\b(?:in|at|from|to|near|within|across|visiting)\s+)(?:${single})\b|\b(?:${multi})\b)`,
    'g',
  );
}

/** Detectors to append when Smart PII is on. Empty when the master switch is off. */
export function smartPiiDetectors(settings: SmartPiiSettings): Detector[] {
  if (!settings.enabled) return [];
  const detectors: Detector[] = [];
  if (settings.address) {
    detectors.push({
      id: 'street-address',
      type: 'address',
      pattern: addressPattern,
    });
  }
  if (settings.organization) {
    detectors.push({
      id: 'organization-name',
      type: 'organization',
      pattern: organizationPattern,
      validate: isLikelyOrganization,
    });
  }
  if (settings.location) {
    detectors.push({
      id: 'geo-location',
      type: 'location',
      pattern: locationPattern,
    });
  }
  if (settings.person) {
    detectors.push({
      id: 'person-name',
      type: 'person',
      pattern: personPattern,
      validate: isLikelyPerson,
    });
  }
  return detectors;
}

/**
 * Keep Smart PII types active even when the user has narrowed `enabledTypes`
 * to a subset of the regex detectors.
 */
export function resolveScanTypes(
  enabledTypes: readonly FindingType[] | null,
  smartPii: SmartPiiSettings = DEFAULT_SMART_PII,
): readonly FindingType[] | undefined {
  if (enabledTypes === null) return undefined;
  if (!smartPii.enabled) return enabledTypes;
  const extra: FindingType[] = [];
  if (smartPii.person) extra.push('person');
  if (smartPii.organization) extra.push('organization');
  if (smartPii.address) extra.push('address');
  if (smartPii.location) extra.push('location');
  return extra.length === 0 ? enabledTypes : [...enabledTypes, ...extra];
}
