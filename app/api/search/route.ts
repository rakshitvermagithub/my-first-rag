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

		const queryEmbedding = embeddingResponse.data[0].embedding;

		const { data: results, error: databaseError } = await supabase.rpc(
			'match_document', 
			{
				query_embedding: JSON.stringify(queryEmbedding), // Pass query vector as a JSON string
        match_threshold: 0.3,                           // Only accept chunks that match by at least 30%
        match_count: 5,                                 // Bring back only the top 5 closest matches				
			}
		);

		if (databaseError) {
			return NextResponse.json(
        { error: databaseError.message }, 
        { status: 500 }
      );
		}

		// In the rows returned as results from our supabase db
		// Take each row.content and join it into one context
		const contextText = results?.map((row: any) => row.content).join('\n---\n') || '';
	}
	catch (err: any) {
			console.log ("Bhaari Error");
	}
}