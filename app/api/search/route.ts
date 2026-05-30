import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { request } from 'http';

// Extract environment variables from system
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

// Initialize client services
const supabase = createClient(url, anonKey);
const openai = new OpenAI();

export async function POST(req: Request) {
	try {
		const { query } = await req.json();

		if (!query || query.trim == '') {
			return NextResponse.json(
				{ error: 'Query text is required' },
				{ status: 400 }
			);
		}

		const embeddingResponse = await openai.embeddings.create({
			input: query,
			model: 'text-embedding-3-small'
		});

		const queryEmbeddings = embeddingResponse.data[0].embedding;
	}
	catch (err: any) {
			console.log ("Bhaari Error");
	}
}