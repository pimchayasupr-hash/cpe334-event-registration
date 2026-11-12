import React, { useState, useEffect } from 'react';
import { api } from './api';
import { User, EventItem, RegistrationItem, RosterResponse } from './types';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<RegistrationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'events' | 'my-registrations' | 'organizer'>('events');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('participant@kmutt.ac.th');
  const [loginPassword, setLoginPassword] = useState<string>('Participant123!');

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventStartAt, setNewEventStartAt] = useState('');
  const [newEventEndAt, setNewEventEndAt] = useState('');
  const [newEventCapacity, setNewEventCapacity] = useState<number>(30);

  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
  const [rosterData, setRosterData] = useState<RosterResponse | null>(null);

  const [capacityEditEventId, setCapacityEditEventId] = useState<string | null>(null);
  const [editCapacityValue, setEditCapacityValue] = useState<number>(10);

  // Load initial user session & events
  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    setLoading(true);
    try {
      const userRes = await api.getMe().catch(() => null);
      if (userRes?.user) {
        setCurrentUser(userRes.user);
      }
      await refreshEvents();
    } finally {
      setLoading(false);
    }
  };

  const refreshEvents = async () => {
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load events:', err);
    }
  };

  const refreshMyRegistrations = async () => {
    try {
      const data = await api.getMyRegistrations();
      setMyRegistrations(data);
    } catch (err: any) {
      console.error('Failed to load registrations:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'my-registrations' && currentUser) {
      refreshMyRegistrations();
    } else if (activeTab === 'events' || activeTab === 'organizer') {
      refreshEvents();
    }
  }, [activeTab, currentUser]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      setCurrentUser(res.user);
      setShowLoginModal(false);
      setSuccessMsg(`Welcome, ${res.user.name}!`);
      if (res.user.role === 'ORGANIZER') {
        setActiveTab('organizer');
      } else {
        setActiveTab('events');
      }
      refreshEvents();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    }
  };

  const handleQuickLogin = async (role: 'PARTICIPANT' | 'ORGANIZER') => {
    setErrorMsg(null);
    const email = role === 'ORGANIZER' ? 'organizer@kmutt.ac.th' : 'participant@kmutt.ac.th';
    const password = role === 'ORGANIZER' ? 'AdminInitial123!' : 'Participant123!';
    try {
      const res = await api.login(email, password);
      setCurrentUser(res.user);
      setSuccessMsg(`Logged in as ${res.user.name} (${res.user.role})`);
      if (role === 'ORGANIZER') {
        setActiveTab('organizer');
      } else {
        setActiveTab('events');
      }
      refreshEvents();
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      setActiveTab('events');
      setSuccessMsg('Logged out successfully');
      refreshEvents();
    } catch (err: any) {
      setErrorMsg(err.message || 'Logout failed');
    }
  };

  const handleRegister = async (eventId: string) => {
    setErrorMsg(null);
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    try {
      await api.registerForEvent(eventId);
      setSuccessMsg('Successfully registered for the event!');
      await refreshEvents();
      if (activeTab === 'my-registrations') {
        await refreshMyRegistrations();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCancelRegistration = async (registrationId: string) => {
    if (!window.confirm('Are you sure you want to cancel this registration?')) return;
    setErrorMsg(null);
    try {
      await api.cancelRegistration(registrationId);
      setSuccessMsg('Registration cancelled.');
      await refreshMyRegistrations();
      await refreshEvents();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.createEvent({
        title: newEventTitle,
        description: newEventDesc,
        location: newEventLocation,
        startAt: new Date(newEventStartAt).toISOString(),
        endAt: new Date(newEventEndAt).toISOString(),
        capacity: Number(newEventCapacity),
      });
      setSuccessMsg('Event created as DRAFT!');
      setShowCreateModal(false);
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventLocation('');
      setNewEventStartAt('');
      setNewEventEndAt('');
      await refreshEvents();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePublishEvent = async (eventId: string) => {
    setErrorMsg(null);
    try {
      await api.publishEvent(eventId);
      setSuccessMsg('Event published successfully!');
      await refreshEvents();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveCapacity = async (eventId: string) => {
    setErrorMsg(null);
    try {
      await api.updateCapacity(eventId, editCapacityValue);
      setSuccessMsg('Capacity updated successfully!');
      setCapacityEditEventId(null);
      await refreshEvents();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to CANCEL this event?')) return;
    setErrorMsg(null);
    try {
      await api.cancelEvent(eventId);
      setSuccessMsg('Event has been cancelled.');
      await refreshEvents();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenRoster = async (eventId: string) => {
    setErrorMsg(null);
    try {
      const data = await api.getEventRoster(eventId);
      setRosterData(data);
      setShowRosterModal(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <header className="navbar">
        <div className="container navbar-inner">
          <div className="brand">
            <span>🎟️ EventReg</span>
            <span className="badge-course">CPE334 Sprint 1</span>
          </div>

          <nav className="nav-links">
            <button
              className={`nav-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Event Catalog
            </button>
            {currentUser && currentUser.role === 'PARTICIPANT' && (
              <button
                className={`nav-btn ${activeTab === 'my-registrations' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-registrations')}
              >
                My Registrations
              </button>
            )}
            {currentUser && currentUser.role === 'ORGANIZER' && (
              <button
                className={`nav-btn ${activeTab === 'organizer' ? 'active' : ''}`}
                onClick={() => setActiveTab('organizer')}
              >
                Organizer Studio
              </button>
            )}
          </nav>

          <div className="user-profile">
            {currentUser ? (
              <>
                <span className={`role-pill ${currentUser.role.toLowerCase()}`}>
                  {currentUser.role}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{currentUser.name}</span>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setShowLoginModal(true)}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Demo Switcher Banner */}
      <div className="demo-banner">
        <div className="container demo-banner-content">
          <div style={{ color: 'var(--text-muted)' }}>
            💡 <strong>Quick Demo Role:</strong> Switch between seeded personas:
          </div>
          <div className="demo-btn-group">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin('PARTICIPANT')}
            >
              Sign In as Participant
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickLogin('ORGANIZER')}
            >
              Sign In as Organizer
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container" style={{ flexGrow: 1, paddingBottom: '3rem' }}>
        {/* Flash Messages */}
        {errorMsg && (
          <div className="alert alert-error" style={{ marginTop: '1.5rem' }}>
            <strong>Error:</strong> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginTop: '1.5rem' }}>
            {successMsg}
          </div>
        )}

        {/* TAB: EVENT CATALOG (F-02, F-03) */}
        {activeTab === 'events' && (
          <section>
            <div className="page-header">
              <div>
                <h1 className="page-title">Upcoming Campus Events</h1>
                <p className="page-subtitle">
                  Browse and reserve seats for workshops, seminars, and tech talks.
                </p>
              </div>
            </div>

            {loading ? (
              <p>Loading events...</p>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                No events currently available.
              </div>
            ) : (
              <div className="grid-cards">
                {events
                  .filter((e) => e.status === 'PUBLISHED' || currentUser?.role === 'ORGANIZER')
                  .map((evt) => {
                    const activeCount = evt.activeRegistrations ?? evt._count?.registrations ?? 0;
                    const seatsLeft = Math.max(0, evt.capacity - activeCount);
                    const isFull = seatsLeft === 0;
                    const fillPercent = Math.min(100, Math.round((activeCount / evt.capacity) * 100));

                    return (
                      <div key={evt.id} className="card">
                        <div className="card-header">
                          <h3 className="card-title">{evt.title}</h3>
                          <span className={`status-badge status-${evt.status.toLowerCase()}`}>
                            {evt.status}
                          </span>
                        </div>
                        <p className="card-desc">{evt.description}</p>
                        <div className="card-meta">
                          <div className="card-meta-row">
                            <span>📍 Location:</span>
                            <strong>{evt.location}</strong>
                          </div>
                          <div className="card-meta-row">
                            <span>📅 Date:</span>
                            <span>{new Date(evt.startAt).toLocaleString()}</span>
                          </div>
                          <div className="card-meta-row">
                            <span>🎟️ Seats:</span>
                            <span>
                              <strong>{seatsLeft}</strong> / {evt.capacity} remaining
                            </span>
                          </div>
                        </div>

                        <div className="seat-progress-bar">
                          <div
                            className="seat-progress-fill"
                            style={{
                              width: `${fillPercent}%`,
                              backgroundColor: isFull ? 'var(--danger)' : 'var(--primary)',
                            }}
                          />
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                          {evt.status === 'PUBLISHED' ? (
                            <button
                              className="btn btn-primary"
                              style={{ width: '100%' }}
                              disabled={isFull}
                              onClick={() => handleRegister(evt.id)}
                            >
                              {isFull ? 'Sold Out' : 'Register Now'}
                            </button>
                          ) : (
                            <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
                              Registration Not Open
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {/* TAB: MY REGISTRATIONS (F-03) */}
        {activeTab === 'my-registrations' && (
          <section>
            <div className="page-header">
              <div>
                <h1 className="page-title">My Registered Events</h1>
                <p className="page-subtitle">Manage your bookings and view event passes.</p>
              </div>
            </div>

            {myRegistrations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                You have not registered for any events yet.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Event Title</th>
                      <th>Location</th>
                      <th>Event Start Time</th>
                      <th>Registered At</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRegistrations.map((reg) => (
                      <tr key={reg.id}>
                        <td style={{ fontWeight: 600 }}>{reg.event.title}</td>
                        <td>{reg.event.location}</td>
                        <td>{new Date(reg.event.startAt).toLocaleString()}</td>
                        <td>{new Date(reg.createdAt).toLocaleString()}</td>
                        <td>
                          <span className={`status-badge status-${reg.status.toLowerCase()}`}>
                            {reg.status}
                          </span>
                        </td>
                        <td>
                          {reg.status === 'CONFIRMED' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelRegistration(reg.id)}
                            >
                              Cancel Booking
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB: ORGANIZER STUDIO (F-02, F-04) */}
        {activeTab === 'organizer' && (
          <section>
            <div className="page-header">
              <div>
                <h1 className="page-title">Organizer Workspace</h1>
                <p className="page-subtitle">
                  Create events, adjust capacity limits, and review attendee rosters.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                + Create New Event
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Registered</th>
                    <th>Start Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => {
                    const activeCount = evt.activeRegistrations ?? evt._count?.registrations ?? 0;
                    return (
                      <tr key={evt.id}>
                        <td style={{ fontWeight: 600 }}>{evt.title}</td>
                        <td>
                          <span className={`status-badge status-${evt.status.toLowerCase()}`}>
                            {evt.status}
                          </span>
                        </td>
                        <td>
                          {capacityEditEventId === evt.id ? (
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                              <input
                                type="number"
                                className="form-input"
                                style={{ width: '70px', padding: '0.25rem' }}
                                value={editCapacityValue}
                                min={activeCount}
                                onChange={(e) => setEditCapacityValue(Number(e.target.value))}
                              />
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSaveCapacity(evt.id)}
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setCapacityEditEventId(null)}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>{evt.capacity}</span>
                              {evt.status !== 'CANCELLED' && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setCapacityEditEventId(evt.id);
                                    setEditCapacityValue(evt.capacity);
                                  }}
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{activeCount}</strong> attendees
                        </td>
                        <td>{new Date(evt.startAt).toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {evt.status === 'DRAFT' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handlePublishEvent(evt.id)}
                              >
                                Publish
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenRoster(evt.id)}
                            >
                              Roster
                            </button>
                            {evt.status !== 'CANCELLED' && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleCancelEvent(evt.id)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Sign In</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowLoginModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Log In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Event (DRAFT)</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label className="form-label">Event Title</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Cloud & AI Seminar 2026"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="Details about the event..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. CB2 Lecture Hall 1"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    required
                    value={newEventStartAt}
                    onChange={(e) => setNewEventStartAt(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    required
                    value={newEventEndAt}
                    onChange={(e) => setNewEventEndAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Initial Capacity</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  required
                  value={newEventCapacity}
                  onChange={(e) => setNewEventCapacity(Number(e.target.value))}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Save as Draft
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ROSTER MODAL (F-04) */}
      {showRosterModal && rosterData && (
        <div className="modal-overlay" onClick={() => setShowRosterModal(false)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Attendee Roster</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {rosterData.title}
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowRosterModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Capacity</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{rosterData.capacity}</div>
              </div>
              <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>Confirmed</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{rosterData.totalConfirmed}</div>
              </div>
              <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>Remaining Seats</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{rosterData.remainingSeats}</div>
              </div>
            </div>

            {rosterData.attendees.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                No participants registered yet.
              </p>
            ) : (
              <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Participant Name</th>
                      <th>Email</th>
                      <th>Registered At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterData.attendees.map((attendee) => (
                      <tr key={attendee.id}>
                        <td style={{ fontWeight: 600 }}>{attendee.user.name}</td>
                        <td>{attendee.user.email}</td>
                        <td>{new Date(attendee.createdAt).toLocaleString()}</td>
                        <td>
                          <span className={`status-badge status-${attendee.status.toLowerCase()}`}>
                            {attendee.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
