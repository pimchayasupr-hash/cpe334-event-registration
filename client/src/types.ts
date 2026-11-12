export type Role = 'ORGANIZER' | 'PARTICIPANT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  capacity: number;
  status: EventStatus;
  organizerId: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
  };
  activeRegistrations?: number;
  remainingSeats?: number;
  _count?: {
    registrations: number;
  };
}

export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED';

export interface RegistrationItem {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  createdAt: string;
  event: EventItem;
}

export interface RosterAttendee {
  id: string;
  userId: string;
  status: RegistrationStatus;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface RosterResponse {
  eventId: string;
  title: string;
  capacity: number;
  totalConfirmed: number;
  remainingSeats: number;
  attendees: RosterAttendee[];
}
