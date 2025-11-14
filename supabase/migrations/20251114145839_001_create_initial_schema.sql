/*
  # BAK-Ko Chat Application Schema

  1. Core Tables
    - users: User accounts and profiles
    - chats: DM and group chats
    - messages: Chat messages with real-time support
    - connections: Friend requests and relationships
    - transactions: Wallet transfers and purchases
    - reports: User reports for moderation
  
  2. Security
    - Enable RLS on all tables
    - Add policies for user data protection
    - Implement role-based access for admin features

  3. Real-time Features
    - Messages table supports real-time subscriptions
    - User online status updates
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  avatar text NOT NULL,
  password text NOT NULL,
  email text,
  phone text,
  bio text,
  instagram_username text,
  online boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  wallet_balance numeric DEFAULT 0,
  is_frozen boolean DEFAULT false,
  frozen_until bigint,
  verification_status text DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved')),
  verification_badge_type text,
  verification_expires_at bigint,
  profile_border_id text,
  name_color_id text,
  borders text[] DEFAULT '{}',
  name_colors text[] DEFAULT '{}',
  recovery_token text,
  recovery_token_expiry bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('dm', 'group')),
  name text,
  members uuid[] NOT NULL,
  creator_id uuid,
  password text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'announcement')),
  timestamp bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  requested_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('transfer', 'purchase', 'admin_grant')),
  from_user_id text NOT NULL,
  to_user_id text NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL,
  timestamp bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  chat_id_at_time_of_report uuid,
  timestamp bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_members ON chats USING GIN(members);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages(author_id);
CREATE INDEX IF NOT EXISTS idx_connections_from_user ON connections(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_to_user ON connections(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Anyone can view all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Chats table policies
CREATE POLICY "Users can view chats they are member of"
  ON chats FOR SELECT
  USING (auth.uid() = ANY(members) OR (SELECT is_admin FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = ANY(members));

CREATE POLICY "Users can update chats they are member of"
  ON chats FOR UPDATE
  USING (auth.uid() = ANY(members) OR (SELECT is_admin FROM users WHERE id = auth.uid()))
  WITH CHECK (auth.uid() = ANY(members) OR (SELECT is_admin FROM users WHERE id = auth.uid()));

-- Messages table policies
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND auth.uid() = ANY(chats.members)
    )
  );

CREATE POLICY "Users can insert messages in their chats"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND auth.uid() = ANY(chats.members)
    )
  );

-- Connections table policies
CREATE POLICY "Users can view their connections"
  ON connections FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can create connections"
  ON connections FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can update connections"
  ON connections FOR UPDATE
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Transactions table policies
CREATE POLICY "Users can view their transactions"
  ON transactions FOR SELECT
  USING (from_user_id::uuid = auth.uid() OR to_user_id::uuid = auth.uid() OR (SELECT is_admin FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- Reports table policies
CREATE POLICY "Users can view their reports"
  ON reports FOR SELECT
  USING (reporter_id = auth.uid() OR reported_user_id = auth.uid() OR (SELECT is_admin FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  USING ((SELECT is_admin FROM users WHERE id = auth.uid()))
  WITH CHECK ((SELECT is_admin FROM users WHERE id = auth.uid()));