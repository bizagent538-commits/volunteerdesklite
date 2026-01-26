# VolunteerDesk Lite - Volunteer Management System

A simple, production-ready volunteer management app for nonprofits, clubs, and organizations with calendar view and SMS notifications.

## Features

- ✅ Member login with member number or email
- 📅 **Calendar view** (default) showing all events
- 📋 List view and personal sign-ups view
- 👥 Admin dashboard for managing events and members
- 📱 **SMS notifications** via Twilio (send reminders to volunteers)
- 🎨 Color-coded event categories
- ⚡ Real-time signup tracking

## Quick Start

### 1. Database Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor to create:
- `members` table (member_number, email, first_name, last_name, phone, status, is_admin)
- `events` table (title, description, category, event_date, times, location, max_volunteers)
- `event_signups` table (tracks who signed up for what)

### 2. Environment Variables

Create a `.env` file or add to Vercel:

```env
# Supabase (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Twilio SMS (Optional - for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 3. Twilio Setup (Optional)

To enable SMS notifications:

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Get a phone number (free trial includes $15 credit)
3. Find your credentials at [twilio.com/console](https://www.twilio.com/console):
   - Account SID
   - Auth Token
   - Phone Number (format: +15551234567)
4. Add these as environment variables in Vercel

**Note:** If Twilio is not configured, the SMS button will show instructions when clicked. The app works fine without it.

### 4. Deploy

```bash
npm install
npm run build
```

Deploy to Vercel or any static hosting. The SMS API endpoint (`/api/send-sms.js`) will work automatically on Vercel.

## Usage

### Member Login
- Members log in with their member number or email
- Default view is the **calendar** showing all upcoming events
- Click any day to see events and sign up
- Switch to List View or My Sign-ups view

### Admin Access
- Admins can create/edit events and members
- Click "📱 SMS" button next to any event to send reminders to all signed-up volunteers
- Toggle between Admin View and Member View

### Event Categories
- Kitchen (yellow)
- Range Safety (blue)
- Grounds (green)
- Work Party (pink)
- Club Events (purple)

## Database Notes

Your existing members table has many columns (date_of_birth, address, etc.). This app only requires:
- member_number
- first_name
- last_name
- email
- phone (optional, for SMS)
- status ('Active' or 'Inactive')
- is_admin (boolean)

The app will work with your existing table structure.

## SMS Features

When configured, admins can:
- Send event reminders to all volunteers signed up for an event
- Customize the message before sending
- See delivery status for each recipient
- Default message includes event details (title, date, time, location)

## Production Ready

This is the production version with:
- ✅ Calendar view as default
- ✅ Twilio SMS integration
- ✅ Phone number field
- ✅ Works with existing member database
- ✅ Proper error handling
- ✅ Status-based authentication (not is_active)

## Support

For issues or questions, check:
- Supabase RLS policies are set correctly
- Environment variables are configured
- Phone numbers are in E.164 format for SMS: +1XXXXXXXXXX

---

Built with React, Supabase, Tailwind CSS, and Twilio
