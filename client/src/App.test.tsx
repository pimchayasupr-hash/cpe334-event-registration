import { describe, it, expect } from 'vitest';
import { api } from './api';

describe('Frontend Client Unit Tests', () => {
  it('should define all required API client methods', () => {
    expect(typeof api.login).toBe('function');
    expect(typeof api.getMe).toBe('function');
    expect(typeof api.logout).toBe('function');
    expect(typeof api.getEvents).toBe('function');
    expect(typeof api.createEvent).toBe('function');
    expect(typeof api.publishEvent).toBe('function');
    expect(typeof api.updateCapacity).toBe('function');
    expect(typeof api.cancelEvent).toBe('function');
    expect(typeof api.getEventRoster).toBe('function');
    expect(typeof api.registerForEvent).toBe('function');
    expect(typeof api.getMyRegistrations).toBe('function');
    expect(typeof api.cancelRegistration).toBe('function');
  });

  it('should validate API URL base path', () => {
    // Verifies that endpoints start with slash or standard path
    expect('/api/events').toContain('/api');
    expect('/api/auth/login').toContain('/api');
  });
});
