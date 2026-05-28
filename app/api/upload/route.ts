import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai'; 

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

// A private key used to bypass RLS or upload files in the supabase db
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for backend storage operations
const supabaseStorage = createClient(url, serviceKey || anonKey);

// Public supabase client
const supabase = createClient(url, anonKey);

// OpenAI Client
const openai = new OpenAI();