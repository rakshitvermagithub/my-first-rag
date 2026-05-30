import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { request } from 'http';
import { Chat } from 'openai/resources';

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

		// Send query with context to ai chat
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
				role: 'system',
				content: 'You are a helpful assistant. Use the provided context to answer questions. If the answer is not in the context, say you do not know. Do not make up facts.'
				},
				{
					role: 'user',
					content: `Context: ${contextText}\n\nQuestion: ${query}`
				}
			]
		})

		const answer = completion.choices[0].message.content;

		return NextResponse.json({
      answer,
      sources: results // This contains our top 5 matching database records
    });


	}
	catch (err: any) {
		return NextResponse.json(
			{ error: err.message || 'An unexpected error occurred during search'},
			{ status: 500 }
		)
	}
}