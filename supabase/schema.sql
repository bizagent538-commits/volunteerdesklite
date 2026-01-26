-- VolunteerDesk Lite Database Schema
-- Run this in Supabase SQL Editor

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_number VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  max_volunteers INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event signups table
CREATE TABLE IF NOT EXISTS event_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_signups_event ON event_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_signups_member ON event_signups(member_id);
CREATE INDEX IF NOT EXISTS idx_members_number ON members(member_number);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for authenticated users
CREATE POLICY "Allow all for members" ON members FOR ALL USING (true);
CREATE POLICY "Allow all for events" ON events FOR ALL USING (true);
CREATE POLICY "Allow all for event_signups" ON event_signups FOR ALL USING (true);

-- Insert a default admin member (change these values!)
INSERT INTO members (member_number, email, first_name, last_name, is_admin, is_active)
VALUES ('ADMIN001', 'admin@example.com', 'Admin', 'User', true, true)
ON CONFLICT (member_number) DO NOTHING;
