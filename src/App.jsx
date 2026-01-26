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

  const handleToggleMemberStatus = async (memberId, currentStatus) => {
    await supabase
      .from('members')
      .update({ is_active: !currentStatus })
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
          {['events', 'members', 'reports'].map(tab => (
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
                  <h2 className="text-xl font-semibold">Members ({members.length})</h2>
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
                      {members.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {m.first_name} {m.last_name}
                            {m.is_admin && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Admin</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">{m.member_number}</td>
                          <td className="px-4 py-3 text-sm">{m.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {m.is_active ? 'Active' : 'Inactive'}
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
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-3xl font-bold" style={{ color: CONFIG.primaryColor }}>{members.length}</div>
                    <div className="text-gray-600">Total Members</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-3xl font-bold" style={{ color: CONFIG.primaryColor }}>{members.filter(m => m.is_active).length}</div>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (event) {
      await supabase.from('events').update(formData).eq('id', event.id);
    } else {
      await supabase.from('events').insert(formData);
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
    is_active: member?.is_active ?? true,
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
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_admin}
                onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Admin</span>
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
