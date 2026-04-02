const BASE = '/api';

function getUser() {
  try { return JSON.parse(localStorage.getItem('sn_user') || 'null'); } catch { return null; }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Auth / Identity
  login: (body) => apiFetch('/auth/login', { method: 'POST', body }),
  createAccount: (body) => apiFetch('/auth/register', { method: 'POST', body }),
  getMe: (personId) => apiFetch(`/auth/me?personId=${personId}`),

  // Events
  listEvents: () => apiFetch('/events/list'),
  myEvents: (personId, hostId) => apiFetch(`/events/my-events?personId=${personId || ''}&hostId=${hostId || ''}`),
  hostedEvents: (hostId) => apiFetch(`/events/hosted?hostId=${hostId}`),
  lookupAttendee: (eventName, personName) =>
    apiFetch(`/events/lookup-attendee?eventName=${encodeURIComponent(eventName)}&personName=${encodeURIComponent(personName)}`),
  createEvent: body => apiFetch('/events/create', { method: 'POST', body }),
  getEvent: id => apiFetch(`/events/${id}`),
  register: (eventId, body) => apiFetch(`/events/${eventId}/register`, { method: 'POST', body }),
  checkin: (eventId, body) => apiFetch(`/events/${eventId}/checkin`, { method: 'POST', body }),
  getAttendees: eventId => apiFetch(`/events/${eventId}/attendees`),
  pendingCheckin: eventId => apiFetch(`/events/${eventId}/pending-checkin`),
  eventsByDate: (date) => apiFetch(`/events/by-date?date=${date}`),
  eventsByDateRange: (start, end) => apiFetch(`/events/by-date-range?start=${start}&end=${end}`),
  lumaImport: (body) => apiFetch('/events/luma-import', { method: 'POST', body }),
  getTimesheets: (eventId) => apiFetch(`/events/${eventId}/timesheets`),
  eventSuggestions: (date, personId) => apiFetch(`/events/suggestions?date=${date}${personId ? `&personId=${personId}` : ''}`),
  getEventRegistration: (eventId, personId) => apiFetch(`/events/${eventId}/registration?personId=${personId}`),

  // Matching
  computeScores: eventId => apiFetch(`/events/${eventId}/compute-scores`, { method: 'POST' }),
  assignGroups: eventId => apiFetch(`/events/${eventId}/assign-groups`, { method: 'POST' }),
  eventTimesheets: eventId => apiFetch(`/events/${eventId}/timesheets`),
  mySchedule: (eventId, personId) => apiFetch(`/events/${eventId}/my-schedule?personId=${personId}`),
  results: (eventId, personId) => apiFetch(`/events/${eventId}/results/${personId}`),

  // AI
  whyCard: body => apiFetch('/ai/why-card', { method: 'POST', body }),
  icebreaker: body => apiFetch('/ai/icebreaker', { method: 'POST', body }),
  matchPrep: body => apiFetch('/ai/match-prep', { method: 'POST', body }),
  briefing: body => apiFetch('/ai/briefing', { method: 'POST', body }),
  groupRationale: body => apiFetch('/ai/group-rationale', { method: 'POST', body }),
  personaInsight: body => apiFetch('/ai/persona-insight', { method: 'POST', body }),
  whyEvent: body => apiFetch('/ai/why-event', { method: 'POST', body }),

  // Connections
  rateConnection: body => apiFetch('/connections/rate', { method: 'POST', body }),

  // Profile
  getProfile: (personId) => apiFetch(`/profiles/${personId}`),
  saveProfile: (personId, body) => apiFetch(`/profiles/${personId}`, { method: 'PUT', body }),

  // Personalization chat
  chatPersonalization: (body) => apiFetch('/personalization/chat', { method: 'POST', body }),

  // Email
  sendSchedule: (body) => apiFetch('/email/send-schedule', { method: 'POST', body }),
};
