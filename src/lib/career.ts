import type { CareerEvent } from '../data/site';

/**
 * The career projection. Every field is derived by folding career events in
 * stream order; nothing here is hard-coded per position.
 */
export type Role = {
  title: string;
  org: string;
  orgUrl?: string | undefined;
  location?: string | undefined;
  from: string;
  to?: string | undefined;
  summary: string;
  skills: string[];
};

export type CareerProjection = {
  /** Number of events applied (stream position). */
  position: number;
  lastEvent: CareerEvent | undefined;
  /** Latest event date seen; monotonic, so year-only dates never move time backwards. */
  clock: string | undefined;
  /** Date of the first event that is not education. */
  shippingSince: string | undefined;
  currentRole: Role | undefined;
  /** Every role still open, newest first (Sindre holds two at once). */
  currentRoles: Role[];
  roles: Role[];
  affiliations: string[];
  skills: string[];
  /** Skills introduced by the last applied event. */
  newSkills: string[];
  eventTypes: Record<string, number>;
};

/** Event types that mean "joined an organisation". Presentation rule only. */
const AFFILIATION_EVENTS = new Set([
  'StudiesStarted',
  'VolunteerTeamJoined',
  'PartTimeRoleStarted',
  'ContractStarted',
  'EmploymentStarted',
  'CompanyCoFounded',
]);

const EDUCATION_EVENTS = new Set(['StudiesStarted', 'DegreeCompleted', 'CertificationsEarned']);

export const initialProjection: CareerProjection = {
  position: 0,
  lastEvent: undefined,
  clock: undefined,
  shippingSince: undefined,
  currentRole: undefined,
  currentRoles: [],
  roles: [],
  affiliations: [],
  skills: [],
  newSkills: [],
  eventTypes: {},
};

/** Normalises 'YYYY' and 'YYYY-MM' to a sortable 'YYYY-MM'. */
export const normaliseDate = (date: string): string => (date.length === 4 ? `${date}-01` : date);

const later = (a: string | undefined, b: string): string => (!a || b > a ? b : a);

/** Pure reducer: applies one event to a projection. */
export function apply(state: CareerProjection, event: CareerEvent): CareerProjection {
  const date = normaliseDate(event.date);

  let roles = state.roles;
  if (event.endsRole) {
    roles = roles.map((r) => (r.org === event.endsRole && !r.to ? { ...r, to: event.date } : r));
  }
  if (event.role && event.org) {
    roles = [
      ...roles,
      {
        title: event.role,
        org: event.org,
        orgUrl: event.orgUrl,
        location: event.location,
        from: event.date,
        summary: event.summary,
        skills: event.skills ?? [],
      },
    ];
  }

  const currentRoles = [...roles].reverse().filter((r) => !r.to);
  const currentRole = currentRoles[0];

  const affiliations =
    event.org && AFFILIATION_EVENTS.has(event.type) && !state.affiliations.includes(event.org)
      ? [...state.affiliations, event.org]
      : state.affiliations;

  const newSkills = (event.skills ?? []).filter((s) => !state.skills.includes(s));

  return {
    position: state.position + 1,
    lastEvent: event,
    clock: later(state.clock, date),
    shippingSince: state.shippingSince ?? (EDUCATION_EVENTS.has(event.type) ? undefined : date),
    currentRole,
    currentRoles,
    roles,
    affiliations,
    skills: [...state.skills, ...newSkills],
    newSkills,
    eventTypes: { ...state.eventTypes, [event.type]: (state.eventTypes[event.type] ?? 0) + 1 },
  };
}

/** Replays the first `position` events of a stream. */
export const project = (events: readonly CareerEvent[], position = events.length): CareerProjection =>
  events.slice(0, position).reduce(apply, initialProjection);

const monthIndex = (date: string): number => {
  const [y, m] = normaliseDate(date).split('-').map(Number);
  return (y ?? 0) * 12 + ((m ?? 1) - 1);
};

/** Years between two YYYY-MM dates, one decimal. */
export const yearsBetween = (from: string | undefined, to: string | undefined): number =>
  from && to ? Math.max(0, Math.round(((monthIndex(to) - monthIndex(from)) / 12) * 10) / 10) : 0;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM' -> 'Jun 2025', 'YYYY' -> '2025'. */
export function formatMonth(date: string): string {
  if (date.length === 4) return date;
  const [y, m] = date.split('-');
  return `${MONTHS[Number(m) - 1] ?? ''} ${y}`;
}

/** "also Co-founder & Chief Architect · Cratis" for the open roles beyond the newest one. */
export const alsoText = (state: CareerProjection): string =>
  state.currentRoles.length > 1
    ? `also ${state.currentRoles
        .slice(1)
        .map((r) => `${r.title} · ${r.org}`)
        .join(', ')}`
    : '';
