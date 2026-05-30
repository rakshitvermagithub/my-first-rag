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

		// User wants to view or inline download a file
		if (id && file) {
			const { data: documents } = await supabase.from('documents').select('metadata').eq('metadata->>document_id', id).limit(1);

			if (!documents || documents.length === 0)
				return NextResponse.json({ error: 'Document not found' }, { status: 404 });        

			const meta = documents[0].metadata;
			const fileName = meta?.file_name || 'document';
			const fileType = meta?.file_type || 'application/octet-stream';
			const filePath = meta?.file_path || `${id}.${fileName.split('.').pop() || 'pdf'}`;

			// Download the physical file binary from our Supabase Storage bucket
			const { data: fileData, error: downloadError } = await supabaseStorage.storage.from('documents').download(filePath);

			if (downloadError || !fileData) {
				return NextResponse.json(
					{ error: downloadError?.message || 'File not found in storage' }, 
					{ status: 404 }
				);
			} 
			
			const buffer = Buffer.from(await fileData.arrayBuffer());
			if (buffer.length === 0) {
				return NextResponse.json({ error: 'File content is empty' }, { status: 500 });
			}

			// Check if file is pdf
			const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

			return new NextResponse(new Uint8Array(buffer), {
				headers: {
					'Content-Type': fileType,
					'Content-Disposition': (view && isPDF) 
						? `inline; filename="${fileName}"` 
						: `attachment; filename="${fileName}"`,
					'Content-Length': buffer.length.toString(),
					...(view && isPDF ? { 'X-Content-Type-Options': 'nosniff' } : {}),
				},
			});
		}

	}