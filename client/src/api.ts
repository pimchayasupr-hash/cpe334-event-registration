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
  // Auth
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

  // Events
  async getEvents(): Promise<EventItem[]> {
    return fetchJSON<EventItem[]>('/events');
  },

  async createEvent(eventData: {
    title: string;
    description: string;
    location: string;
    startAt: string;
    endAt: string;
    capacity: number;
  }): Promise<EventItem> {
    return fetchJSON<EventItem>('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  async publishEvent(eventId: string): Promise<EventItem> {
    return fetchJSON<EventItem>(`/events/${eventId}/publish`, {
      method: 'PATCH',
    });
  },

  async updateCapacity(eventId: string, capacity: number): Promise<EventItem> {
    return fetchJSON<EventItem>(`/events/${eventId}/capacity`, {
      method: 'PATCH',
      body: JSON.stringify({ capacity }),
    });
  },

  async cancelEvent(eventId: string): Promise<EventItem> {
    return fetchJSON<EventItem>(`/events/${eventId}/cancel`, {
      method: 'PATCH',
    });
  },

  async getEventRoster(eventId: string): Promise<RosterResponse> {
    return fetchJSON<RosterResponse>(`/events/${eventId}/roster`);
  },

  // Registrations
  async registerForEvent(eventId: string): Promise<RegistrationItem> {
    return fetchJSON<RegistrationItem>(`/events/${eventId}/register`, {
      method: 'POST',
    });
  },

  async getMyRegistrations(): Promise<RegistrationItem[]> {
    return fetchJSON<RegistrationItem[]>('/my-registrations');
  },

  async cancelRegistration(registrationId: string): Promise<{ message: string }> {
    return fetchJSON<{ message: string }>(`/registrations/${registrationId}`, {
      method: 'DELETE',
    });
  },
};
