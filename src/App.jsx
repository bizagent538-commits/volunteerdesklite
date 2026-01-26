import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// Configuration - Edit these for your organization
const CONFIG = {
  orgName: 'Your Organization',
  primaryColor: '#166534', // Green
};

// Simple date formatting
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Login Component
function Login({ onLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: member, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .or(`member_number.eq.${identifier},email.ilike.${identifier}`)
        .single();

      if (fetchError || !member) {
        setError('Member not found. Please check your member number or email.');
        setLoading(false);
        return;
      }

      if (!member.is_active) {
        setError('Your membership is inactive. Please contact an administrator.');
        setLoading(false);
        return;
      }

      onLogin(member);
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: CONFIG.primaryColor }}>
          {CONFIG.orgName}
        </h1>
        <h2 className="text-lg text-gray-600 text-center mb-6">Volunteer Sign-Up</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Member Number or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter member # or email"
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg text-white font-semibold transition-colors"
            style={{ backgroundColor: CONFIG.primaryColor }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, memberId, onSignup, onCancel, isSignedUp }) {
  const spotsLeft = event.max_volunteers - (event.signup_count || 0);
  const isFull = spotsLeft <= 0;
  const isPast = new Date(event.event_date) < new Date(new Date().setHours(0,0,0,0));

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold" style={{ color: CONFIG.primaryColor }}>
          {event.title}
        </h3>
        {event.category && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
            {event.category}
          </span>
        )}
      </div>
      
      <p className="text-gray-600 text-sm mb-3">{event.description}</p>
      
      <div className="text-sm text-gray-500 mb-3">
        <div>📅 {formatDate(event.event_date)}</div>
        {event.start_time && (
          <div>🕐 {formatTime(event.start_time)} {event.end_time && `- ${formatTime(event.end_time)}`}</div>
        )}
        {event.location && <div>📍 {event.location}</div>}
        <div className={`font-medium ${isFull ? 'text-red-600' : 'text-green-600'}`}>
          👥 {spotsLeft} of {event.max_volunteers} spots available
        </div>
      </div>
      
      {!isPast && (
        isSignedUp ? (
          <button
            onClick={() => onCancel(event.id)}
            className="w-full py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Cancel My Signup
          </button>
        ) : (
          <button
            onClick={() => onSignup(event.id)}
            disabled={isFull}
            className={`w-full py-2 px-4 rounded-lg text-white transition-colors ${
              isFull ? 'bg-gray-400 cursor-not-allowed' : ''
            }`}
            style={{ backgroundColor: isFull ? undefined : CONFIG.primaryColor }}
          >
            {isFull ? 'Event Full' : 'Sign Up'}
          </button>
        )
      )}
      {isPast && (
        <div className="text-center text-gray-500 text-sm py-2">Event has passed</div>
      )}
    </div>
  );
}

// Member Dashboard
function MemberDashboard({ member, onLogout }) {
  const [events, setEvents] = useState([]);
  const [mySignups, setMySignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('upcoming');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const { data: eventsData } = await supabase
      .from('events')
      .select(`*, signups:event_signups(count)`)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    const processedEvents = (eventsData || []).map(event => ({
      ...event,
      signup_count: event.signups?.[0]?.count || 0
    }));
    
    setEvents(processedEvents);

    const { data: signupsData } = await supabase
      .from('event_signups')
      .select('event_id')
      .eq('member_id', member.id);
    
    setMySignups((signupsData || []).map(s => s.event_id));
    setLoading(false);
  };

  const handleSignup = async (eventId) => {
    const { error } = await supabase
      .from('event_signups')
      .insert({ event_id: eventId, member_id: member.id });
    
    if (!error) {
      setMySignups([...mySignups, eventId]);
      loadData();
    }
  };

  const handleCancel = async (eventId) => {
    const { error } = await supabase
      .from('event_signups')
      .delete()
      .eq('event_id', eventId)
      .eq('member_id', member.id);
    
    if (!error) {
      setMySignups(mySignups.filter(id => id !== eventId));
      loadData();
    }
  };

  const filteredEvents = view === 'my-signups' 
    ? events.filter(e => mySignups.includes(e.id))
    : events;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="text-white p-4 shadow-md" style={{ backgroundColor: CONFIG.primaryColor }}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{CONFIG.orgName}</h1>
            <p className="text-sm opacity-90">Welcome, {member.first_name}!</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('upcoming')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'upcoming' ? 'text-white' : 'bg-white text-gray-700'
            }`}
            style={{ backgroundColor: view === 'upcoming' ? CONFIG.primaryColor : undefined }}
          >
            Upcoming Events
          </button>
          <button
            onClick={() => setView('my-signups')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'my-signups' ? 'text-white' : 'bg-white text-gray-700'
            }`}
            style={{ backgroundColor: view === 'my-signups' ? CONFIG.primaryColor : undefined }}
          >
            My Sign-ups ({mySignups.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {view === 'my-signups' ? 'You haven\'t signed up for any events yet.' : 'No upcoming events.'}
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              memberId={member.id}
              onSignup={handleSignup}
              onCancel={handleCancel}
              isSignedUp={mySignups.includes(event.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Admin Dashboard
function AdminDashboard({ member, onLogout, onSwitchToMember }) {
  const [view, setView] = useState('events');
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const { data: eventsData } = await supabase
      .from('events')
      .select(`*, signups:event_signups(count)`)
      .order('event_date', { ascending: true });
    
    const processedEvents = (eventsData || []).map(event => ({
      ...event,
      signup_count: event.signups?.[0]?.
