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
  const [matches, setMatches] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setMatches([]);

    try {
      const trimmed = identifier.trim();

      // Try exact matches first: member number or email
      const { data: exactData } = await supabase
        .from('members')
        .select('*')
        .or(`member_number.eq.${trimmed},email.ilike.${trimmed}`)
        .eq('status', 'Active');

      if (exactData && exactData.length === 1) {
        onLogin(exactData[0]);
        setLoading(false);
        return;
      }

      if (exactData && exactData.length > 1) {
        setMatches(exactData);
        setLoading(false);
        return;
      }

      // Fall back to name search
      const { data: nameData } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'Active')
        .or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`);

      if (!nameData || nameData.length === 0) {
        setError('No active member found. Please check your entry.');
        setLoading(false);
        return;
      }

      if (nameData.length === 1) {
        onLogin(nameData[0]);
        setLoading(false);
        return;
      }

      // Multiple name matches — show picker
      setMatches(nameData);
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    setLoading(false);
  };

  const selectMatch = (member) => {
    setMatches([]);
    setIdentifier('');
    onLogin(member);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: CONFIG.primaryColor }}>
          {CONFIG.orgName}
        </h1>
        <h2 className="text-lg text-gray-600 text-center mb-6">Volunteer Sign-Up</h2>

        {matches.length === 0 ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Member Number, Email, or Name
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter member #, email, or name"
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
        ) : (
          <div>
            <p className="text-gray-600 text-sm mb-3">Multiple members found — select yours:</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {matches.map(m => (
                <button
                  key={m.id}
                  onClick={() => selectMatch(m)}
                  className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold">{m.first_name} {m.last_name}</span>
                  <span className="text-gray-500 text-sm ml-2">#{m.member_number}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setMatches([]); setError(''); }}
              className="mt-4 text-sm text-gray-500 underline"
            >
              ← Back
            </button>
          </div>
        )}
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

// Calendar helpers
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const days = [];
  
  // Add empty slots for days before the first of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  
  return days;
}

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.toDateString() === date2.toDateString();
}

// Member Dashboard with Calendar View
function MemberDashboard({ member, onLogout }) {
  const [events, setEvents] = useState([]);
  const [mySignups, setMySignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const { data: eventsData } = await supabase
      .from('events')
      .select(`*, signups:event_signups(count)`)
      .gte('event_date', (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })())
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

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toLocalDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => event.event_date === toLocalDateStr(date));
  };

  const filteredEvents = view === 'my-signups' 
    ? events.filter(e => mySignups.includes(e.id))
    : view === 'list'
    ? events
    : selectedDate
    ? getEventsForDate(selectedDate)
    : [];

  const calendarDays = getCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="text-white p-4 shadow-md" style={{ backgroundColor: CONFIG.primaryColor }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
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

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => { setView('calendar'); setSelectedDate(null); }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'calendar' ? 'text-white' : 'bg-white text-gray-700'
            }`}
            style={{ backgroundColor: view === 'calendar' ? CONFIG.primaryColor : undefined }}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'list' ? 'text-white' : 'bg-white text-gray-700'
            }`}
            style={{ backgroundColor: view === 'list' ? CONFIG.primaryColor : undefined }}
          >
            📋 List View
          </button>
          <button
            onClick={() => setView('my-signups')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'my-signups' ? 'text-white' : 'bg-white text-gray-700'
            }`}
            style={{ backgroundColor: view === 'my-signups' ? CONFIG.primaryColor : undefined }}
          >
            ✓ My Sign-ups ({mySignups.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading events...</div>
        ) : (
          <>
            {view === 'calendar' && (
              <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    ← Prev
                  </button>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <button
                      onClick={goToToday}
                      className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Today
                    </button>
                  </div>
                  <button
                    onClick={goToNextMonth}
                    className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Next →
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map(day => (
                    <div key={day} className="text-center font-semibold text-gray-600 p-2 text-sm">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, index) => {
                    const dayEvents = day ? getEventsForDate(day) : [];
                    const isToday = day && isSameDay(day, new Date());
                    const isSelected = day && selectedDate && isSameDay(day, selectedDate);
                    
                    return (
                      <div
                        key={index}
                        onClick={() => day && setSelectedDate(day)}
                        className={`min-h-24 p-2 border rounded cursor-pointer transition-colors ${
                          !day ? 'bg-gray-50' : isSelected ? 'bg-blue-100 border-blue-500' : isToday ? 'bg-green-50 border-green-500' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        {day && (
                          <>
                            <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-green-700' : 'text-gray-700'}`}>
                              {day.getDate()}
                            </div>
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                className="text-xs p-1 mb-1 rounded truncate"
                                style={{ backgroundColor: getCategoryColor(event.category) }}
                                title={event.title}
                              >
                                {event.title}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedDate && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-semibold mb-2">
                      Events on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </h3>
                    {filteredEvents.length === 0 ? (
                      <p className="text-gray-500 text-sm">No events on this day.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredEvents.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            memberId={member.id}
                            onSignup={handleSignup}
                            onCancel={handleCancel}
                            isSignedUp={mySignups.includes(event.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {view === 'list' && (
              <div>
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No upcoming events.</div>
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
            )}

            {view === 'my-signups' && (
              <div>
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">You haven't signed up for any events yet.</div>
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
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helper function for category colors
function getCategoryColor(category) {
  const colors = {
    'Kitchen': '#fef3c7',
    'Range Safety': '#dbeafe',
    'Grounds': '#d1fae5',
    'Work Party': '#fce7f3',
    'Club Events': '#e0e7ff',
  };
  return colors[category] || '#f3f4f6';
}

// Admin Calendar View Component
function AdminCalendarView({ events }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toLocalDateStr2 = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => event.event_date === toLocalDateStr2(date));
  };

  const calendarDays = getCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPreviousMonth}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            Today
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 p-2 text-sm">
            {day}
          </div>
        ))}
        {calendarDays.map((day, index) => {
          const dayEvents = day ? getEventsForDate(day) : [];
          const isToday = day && isSameDay(day, new Date());
          const isSelected = day && selectedDate && isSameDay(day, selectedDate);
          
          return (
            <div
              key={index}
              onClick={() => day && setSelectedDate(day)}
              className={`min-h-24 p-2 border rounded cursor-pointer transition-colors ${
                !day ? 'bg-gray-50' : isSelected ? 'bg-blue-100 border-blue-500' : isToday ? 'bg-green-50 border-green-500' : 'bg-white hover:bg-gray-50'
              }`}
            >
              {day && (
                <>
                  <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-green-700' : 'text-gray-700'}`}>
                    {day.getDate()}
                  </div>
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 mb-1 rounded truncate"
                      style={{ backgroundColor: getCategoryColor(event.category) }}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="font-semibold mb-2">
            Events on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(event => (
                <div key={event.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold" style={{ color: CONFIG.primaryColor }}>{event.title}</h4>
                    {event.category && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                        {event.category}
                      </span>
                    )}
                  </div>
                  {event.description && <p className="text-sm text-gray-600 mb-2">{event.description}</p>}
                  <div className="text-sm text-gray-500">
                    {event.start_time && (
                      <div>🕐 {formatTime(event.start_time)} {event.end_time && `- ${formatTime(event.end_time)}`}</div>
                    )}
                    {event.location && <div>📍 {event.location}</div>}
                    <div className="font-medium text-gray-700">
                      👥 {event.signup_count} / {event.max_volunteers} volunteers signed up
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Admin Dashboard
function AdminDashboard({ member, onLogout, onSwitchToMember }) {
  const [view, setView] = useState('calendar');
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

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
      signup_count: event.signups?.[0]?.count || 0
    }));
    setEvents(processedEvents);

    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .order('last_name', { ascending: true });
    
    setMembers(membersData || []);
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Delete this event? All signups will be removed.')) return;
    
    await supabase.from('event_signups').delete().eq('event_id', eventId);
    await supabase.from('events').delete().eq('id', eventId);
    loadData();
  };

  const handleSendEventSMS = (event) => {
    setSelectedEvent(event);
    setShowSMSModal(true);
  };

  const handleToggleMemberStatus = async (memberId, currentStatus) => {
    await supabase
      .from('members')
      .update({ status: currentStatus === 'Active' ? 'Inactive' : 'Active' })
      .eq('id', memberId);
    loadData();
  };

  const handleToggleMemberAdmin = async (memberId, currentStatus) => {
    await supabase
      .from('members')
      .update({ is_admin: !currentStatus })
      .eq('id', memberId);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="text-white p-4 shadow-md" style={{ backgroundColor: CONFIG.primaryColor }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{CONFIG.orgName} - Admin</h1>
            <p className="text-sm opacity-90">Welcome, {member.first_name}!</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSwitchToMember}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              Member View
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4">
          {['calendar', 'events', ...(member.is_superadmin ? ['members', 'reports'] : [])].map(tab => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                view === tab ? 'text-white' : 'bg-white text-gray-700'
              }`}
              style={{ backgroundColor: view === tab ? CONFIG.primaryColor : undefined }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {view === 'calendar' && (
              <AdminCalendarView events={events} />
            )}

            {view === 'events' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Events</h2>
                  <button
                    onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
                    className="px-4 py-2 text-white rounded-lg"
                    style={{ backgroundColor: CONFIG.primaryColor }}
                  >
                    + Add Event
                  </button>
                </div>
                
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Event</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Signups</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {events.map(event => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-gray-500">{event.category}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{formatDate(event.event_date)}</td>
                          <td className="px-4 py-3 text-sm">{event.signup_count} / {event.max_volunteers}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setEditingEvent(event); setShowEventForm(true); }}
                              className="text-blue-600 hover:underline mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleSendEventSMS(event)}
                              className="text-green-600 hover:underline mr-3"
                              title="Send SMS to volunteers"
                            >
                              📱 SMS
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'members' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Active Members ({members.filter(m => m.status === 'Active').length})</h2>
                  <button
                    onClick={() => { setEditingMember(null); setShowMemberForm(true); }}
                    className="px-4 py-2 text-white rounded-lg"
                    style={{ backgroundColor: CONFIG.primaryColor }}
                  >
                    + Add Member
                  </button>
                </div>
                
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Member #</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {members.filter(m => m.status === 'Active').map(m => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {m.first_name} {m.last_name}
                            {m.is_admin && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Admin</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">{m.member_number}</td>
                          <td className="px-4 py-3 text-sm">{m.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded ${m.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => { setEditingMember(m); setShowMemberForm(true); }}
                              className="text-blue-600 hover:underline mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleMemberStatus(m.id, m.is_active)}
                              className="text-yellow-600 hover:underline mr-2"
                            >
                              {m.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleToggleMemberAdmin(m.id, m.is_admin)}
                              className="text-purple-600 hover:underline"
                            >
                              {m.is_admin ? 'Remove Admin' : 'Make Admin'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'reports' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Reports</h2>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-3xl font-bold" style={{ color: CONFIG.primaryColor }}>{members.filter(m => m.status === 'Active').length}</div>
                    <div className="text-gray-600">Active Members</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-3xl font-bold" style={{ color: CONFIG.primaryColor }}>{events.filter(e => new Date(e.event_date) >= new Date()).length}</div>
                    <div className="text-gray-600">Upcoming Events</div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold mb-3">Upcoming Events Summary</h3>
                  {events.filter(e => new Date(e.event_date) >= new Date()).slice(0, 5).map(event => (
                    <div key={event.id} className="flex justify-between py-2 border-b last:border-0">
                      <span>{event.title}</span>
                      <span className="text-gray-600">{event.signup_count} / {event.max_volunteers} volunteers</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showEventForm && (
        <EventFormModal
          event={editingEvent}
          onClose={() => setShowEventForm(false)}
          onSave={() => { setShowEventForm(false); loadData(); }}
        />
      )}

      {showMemberForm && (
        <MemberFormModal
          member={editingMember}
          onClose={() => setShowMemberForm(false)}
          onSave={() => { setShowMemberForm(false); loadData(); }}
        />
      )}

      {showSMSModal && selectedEvent && (
        <SMSModal
          event={selectedEvent}
          onClose={() => { setShowSMSModal(false); setSelectedEvent(null); }}
        />
      )}
    </div>
  );
}

// SMS Modal Component
function SMSModal({ event, onClose }) {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState([]);
  const [twilioConfigured, setTwilioConfigured] = useState(true);

  useEffect(() => {
    loadVolunteers();
    
    // Set default message
    const defaultMsg = `Reminder: ${event.title} on ${formatDate(event.event_date)}${event.start_time ? ` at ${formatTime(event.start_time)}` : ''}. ${event.location ? `Location: ${event.location}.` : ''} Thank you for volunteering!`;
    setMessage(defaultMsg);
  }, []);

  const loadVolunteers = async () => {
    setLoading(true);
    
    // Get all signups for this event with member details
    const { data: signups } = await supabase
      .from('event_signups')
      .select(`
        member_id,
        members (
          id,
          first_name,
          last_name,
          phone,
          email
        )
      `)
      .eq('event_id', event.id);

    const volunteersWithPhone = (signups || [])
      .map(s => s.members)
      .filter(m => m && m.phone);
    
    setVolunteers(volunteersWithPhone);
    setLoading(false);
  };

  const handleSendSMS = async () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    if (volunteers.length === 0) {
      alert('No volunteers with phone numbers found for this event');
      return;
    }

    if (!confirm(`Send SMS to ${volunteers.length} volunteer(s)?`)) {
      return;
    }

    setSending(true);
    const sendResults = [];

    for (const volunteer of volunteers) {
      try {
        const response = await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: volunteer.phone,
            message: message,
            eventTitle: event.title
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          sendResults.push({
            name: `${volunteer.first_name} ${volunteer.last_name}`,
            phone: volunteer.phone,
            status: 'sent',
            messageSid: data.messageSid
          });
        } else {
          if (data.configured === false) {
            setTwilioConfigured(false);
            setSending(false);
            return;
          }
          sendResults.push({
            name: `${volunteer.first_name} ${volunteer.last_name}`,
            phone: volunteer.phone,
            status: 'failed',
            error: data.error || 'Unknown error'
          });
        }
      } catch (error) {
        sendResults.push({
          name: `${volunteer.first_name} ${volunteer.last_name}`,
          phone: volunteer.phone,
          status: 'failed',
          error: error.message
        });
      }
    }

    setResults(sendResults);
    setSending(false);
  };

  if (!twilioConfigured) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Twilio Not Configured</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm mb-2">To enable SMS notifications, you need to configure Twilio environment variables in your Vercel project:</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><code className="bg-gray-100 px-1">TWILIO_ACCOUNT_SID</code></li>
              <li><code className="bg-gray-100 px-1">TWILIO_AUTH_TOKEN</code></li>
              <li><code className="bg-gray-100 px-1">TWILIO_PHONE_NUMBER</code></li>
            </ul>
            <p className="text-sm mt-3">Get these credentials from your Twilio account dashboard at <a href="https://www.twilio.com/console" target="_blank" rel="noopener" className="text-blue-600 underline">twilio.com/console</a></p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Send SMS Notification</h2>
          <p className="text-sm text-gray-600 mt-1">Event: {event.title}</p>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading volunteers...</div>
          ) : (
            <>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Recipients</label>
                  <span className="text-sm text-gray-600">{volunteers.length} volunteer(s) with phone numbers</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {volunteers.length === 0 ? (
                    <p className="text-sm text-gray-500">No volunteers with phone numbers signed up for this event</p>
                  ) : (
                    <div className="space-y-1">
                      {volunteers.map((v, idx) => (
                        <div key={idx} className="text-sm">
                          {v.first_name} {v.last_name} - {v.phone}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows="5"
                  maxLength="320"
                  placeholder="Enter your message..."
                />
                <div className="text-xs text-gray-500 mt-1">{message.length}/320 characters</div>
              </div>

              {results.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="font-semibold text-sm mb-2">Send Results:</h3>
                  <div className="space-y-1">
                    {results.map((result, idx) => (
                      <div key={idx} className={`text-sm ${result.status === 'sent' ? 'text-green-600' : 'text-red-600'}`}>
                        {result.name}: {result.status === 'sent' ? '✓ Sent' : `✗ Failed - ${result.error}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50"
                  disabled={sending}
                >
                  {results.length > 0 ? 'Close' : 'Cancel'}
                </button>
                {volunteers.length > 0 && results.length === 0 && (
                  <button
                    onClick={handleSendSMS}
                    disabled={sending || !message.trim()}
                    className="flex-1 py-2 px-4 text-white rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: CONFIG.primaryColor }}
                  >
                    {sending ? 'Sending...' : `Send to ${volunteers.length} Volunteer(s)`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Event Form Modal
function EventFormModal({ event, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || '',
    event_date: event?.event_date || '',
    start_time: event?.start_time || '',
    end_time: event?.end_time || '',
    location: event?.location || '',
    max_volunteers: event?.max_volunteers || 10,
  });
  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');

    if (event) {
      const { error } = await supabase.from('events').update(formData).eq('id', event.id);
      if (error) { setSaveError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('events').insert(formData);
      if (error) { setSaveError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{event ? 'Edit Event' : 'Add Event'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              rows="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="e.g., Kitchen, Grounds, Events"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              required
              value={formData.event_date}
              onChange={(e) => setFormData({...formData, event_date: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Volunteers *</label>
            <input
              type="number"
              required
              min="1"
              value={formData.max_volunteers}
              onChange={(e) => setFormData({...formData, max_volunteers: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 px-4 text-white rounded-lg"
              style={{ backgroundColor: CONFIG.primaryColor }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {saveError && (
            <div className="mt-3 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{saveError}</div>
          )}
        </form>
      </div>
    </div>
  );
}

// Member Form Modal
function MemberFormModal({ member, onClose, onSave }) {
  const [formData, setFormData] = useState({
    first_name: member?.first_name || '',
    last_name: member?.last_name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    member_number: member?.member_number || '',
    status: member?.status || 'Active',
    is_admin: member?.is_admin ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (member) {
      const { error: updateError } = await supabase
        .from('members')
        .update(formData)
        .eq('id', member.id);
      
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('members')
        .insert(formData);
      
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{member ? 'Edit Member' : 'Add Member'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member Number *</label>
            <input
              type="text"
              required
              value={formData.member_number}
              onChange={(e) => setFormData({...formData, member_number: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_admin}
                onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Admin Access</span>
            </label>
          </div>
          
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 px-4 text-white rounded-lg"
              style={{ backgroundColor: CONFIG.primaryColor }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [member, setMember] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);

  const handleLogin = (loggedInMember) => {
    setMember(loggedInMember);
    setIsAdminView(loggedInMember.is_admin);
  };

  const handleLogout = () => {
    setMember(null);
    setIsAdminView(false);
  };

  if (!member) {
    return <Login onLogin={handleLogin} />;
  }

  if (member.is_admin && isAdminView) {
    return (
      <AdminDashboard
        member={member}
        onLogout={handleLogout}
        onSwitchToMember={() => setIsAdminView(false)}
      />
    );
  }

  return (
    <MemberDashboard
      member={member}
      onLogout={handleLogout}
    />
  );
}

export default App;
