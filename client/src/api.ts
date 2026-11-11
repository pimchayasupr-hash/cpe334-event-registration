import { User, EventItem, RegistrationItem, RosterResponse } from './types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth (F-01)
  async login(email: string, password: string): Promise<{ user: User }> {
    return fetchJSON<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return fetchJSON<{ user: User }>('/auth/me');
  },

  async logout(): Promise<{ message: string }> {
    return fetchJSON<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  // Events (F-02)
  async getEvents(): Promise<EventItem[]> {
    const res = await fetchJSON<{ events: EventItem[] } | EventItem[]>('/events');
    return Array.isArray(res) ? res : res.events || [];
  },

  async createEvent(eventData: {
    title: string;
    description: string;
    location: string;
    startAt: string;
    endAt: string;
    capacity: number;
    category?: string;
  }): Promise<EventItem> {
    const payload = {
      ...eventData,
      category: eventData.category || 'WORKSHOP',
    };
    const res = await fetchJSON<{ event: EventItem } | EventItem>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return 'event' in res ? res.event : res;
  },

  async publishEvent(eventId: string): Promise<EventItem> {
    const res = await fetchJSON<{ event: EventItem } | EventItem>(`/events/${eventId}/publish`, {
      method: 'POST',
    });
    return 'event' in res ? res.event : res;
  },

  async updateCapacity(eventId: string, capacity: number): Promise<EventItem> {
    const res = await fetchJSON<{ event: EventItem } | EventItem>(`/events/${eventId}/capacity`, {
      method: 'PATCH',
      body: JSON.stringify({ capacity }),
    });
    return 'event' in res ? res.event : res;
  },

  async cancelEvent(eventId: string): Promise<EventItem> {
    const res = await fetchJSON<{ event: EventItem } | EventItem>(`/events/${eventId}/cancel`, {
      method: 'PATCH',
    });
    return 'event' in res ? res.event : res;
  },

  // Roster (F-04)
  async getEventRoster(eventId: string): Promise<RosterResponse> {
    // Aligns with Contract F-04: GET /api/events/:id/registrations
    const data = await fetchJSON<{
      event: { id: string; title: string; capacity: number; activeRegistrationsCount: number };
      registrations: Array<{ id: string; status: string; createdAt: string; participant: { id: string; name: string; email: string } }>;
    }>(`/events/${eventId}/registrations`);

    const capacity = data.event?.capacity || 0;
    const totalConfirmed = data.registrations?.length || 0;
    const remainingSeats = Math.max(0, capacity - totalConfirmed);

    return {
      eventId,
      title: data.event?.title || 'Event Roster',
      capacity,
      totalConfirmed,
      remainingSeats,
      attendees: (data.registrations || []).map((r) => ({
        id: r.id,
        userId: r.participant.id,
        status: (r.status as any) || 'CONFIRMED',
        createdAt: r.createdAt,
        user: r.participant,
      })),
    };
  },

  // Registrations (F-03)
  async registerForEvent(eventId: string): Promise<RegistrationItem> {
    // Aligns with Contract F-03: POST /api/events/:id/registrations
    const res = await fetchJSON<{ registration: RegistrationItem } | RegistrationItem>(
      `/events/${eventId}/registrations`,
      { method: 'POST' }
    );
    return 'registration' in res ? res.registration : res;
  },

  async getMyRegistrations(): Promise<RegistrationItem[]> {
    // Aligns with Contract F-03: GET /api/registrations/me
    const res = await fetchJSON<{ registrations: RegistrationItem[] } | RegistrationItem[]>('/registrations/me');
    return Array.isArray(res) ? res : res.registrations || [];
  },

  async cancelRegistration(registrationId: string): Promise<{ message: string }> {
    return fetchJSON<{ message: string }>(`/registrations/${registrationId}`, {
      method: 'DELETE',
    });
  },
};
