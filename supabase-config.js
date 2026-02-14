// supabase-config.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://qcppxhpgsegbrfejnugm.supabase.co'
const supabaseAnonKey = 'sb_publishable_blQGQ6V48YOBMBxliF0G4A_WTAj2754'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/*
== SUPABASE SCHEMA (run in SQL editor) ==

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  ssn TEXT UNIQUE NOT NULL,
  display_picture TEXT,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT, -- 'image','video','audio'
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Likes
CREATE TABLE likes (
  user_id UUID REFERENCES profiles(user_id),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

-- Comments
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Follows
CREATE TABLE follows (
  follower_id UUID REFERENCES profiles(user_id),
  following_id UUID REFERENCES profiles(user_id),
  PRIMARY KEY (follower_id, following_id)
);

-- Groups
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(user_id),
  is_private BOOLEAN DEFAULT false,
  invite_link TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Group members
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id),
  role TEXT DEFAULT 'member', -- 'owner','admin','member'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- Group messages
CREATE TABLE group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id),
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Direct messages
CREATE TABLE direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(user_id),
  recipient_id UUID REFERENCES profiles(user_id),
  content TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Blocks
CREATE TABLE blocks (
  blocker_id UUID REFERENCES profiles(user_id),
  blocked_id UUID REFERENCES profiles(user_id),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Broadcasts (for Swarg Bot)
CREATE TABLE broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS and add policies as needed (simplified for demo)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- etc.
*/
