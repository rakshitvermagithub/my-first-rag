import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

// Client for reading standard table records
const supabase = createClient(url, anonKey);

// Client for administrative storage downloads
const supabaseStorage = createClient(url, serviceKey);

export async function GET(req: Request) {
    try {
        // Construct URL using plain string
        const reqUrl = new URL(req.url);

        // Get relevant information from request URL
        const id = reqUrl.searchParams.get('id');
        // Search params only return either string or null hence === is used
        const file = reqUrl.searchParams.get('file') === 'true';
        const view = reqUrl.searchParams.get('view') === 'true';

        
    }
}