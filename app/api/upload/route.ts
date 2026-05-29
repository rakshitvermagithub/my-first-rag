import { createClient } from '@supabase/supabase-js';
import { error } from 'console';
import OpenAI from 'openai'; 
import mammoth from 'mammoth';
import { NextResponse } from 'next/server';

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

function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    try {
      return decodeURIComponent(str.replace(/%/g, '%25'));
    } catch {
      return str;
    }
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  // Get the raw binary data fromatted for javascript from the file
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    const PDFParser = (await import('pdf2json')).default;
    
    return new Promise ((resolve, reject) => {
      
      // Create instance of PDFParser, set text content extraction to true
      const pdfParser = new (PDFParser as any)(null, true);

      // Add event listeners to the parser before parsing
      pdfParser.on('pdfParser_dataError', (err: any) => {
          reject(new Error(`PDF parsing error: ${err}`));
      })
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          let fullText = '';
          pdfData.Pages?.forEach((page: any) =>
            page.Texts?.forEach((text: any) =>
              text.R?.forEach((r: any) =>
                r.T && (fullText += safeDecodeURIComponent(r.T) + ' ')
              )
            )
          );
          resolve(fullText.trim());
        } catch (err: any) {
          reject(new Error(`Parsing error: ${err}`));
        }
      })

      // Parse text now
      pdfParser.parseBuffer(buffer);
    })
  }
  else if (fileName.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  else if (fileName.endsWith('.txt'))
    return buffer.toString('utf-8');
  else
    throw new Error(`Unsupported file type. Please upload PDF, DOCX, or TXT files.`);
}

export async function POST(req: Request) {
  const file = (await req.formData()).get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 400 });
  }

  // Assign random id
  const documentId = crypto.randomUUID();
  // produce metadata
  const uploadDate = new Date().toISOString();
  const filePath = `${documentId}.${file.name.split('.').pop() || 'bin'}`;

  // Upload file buffer to supabase storage
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const {error: storageError} = await supabase.storage.from('documents')
    .upload(filePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (storageError) {
    return NextResponse.json({ success: false, error: storageError.message }, { status: 500 });
  } 

  // After uplaoded successfully, Get public URL for the file
  const { data: urlData } = supabaseStorage.storage.from('documents').getPublicUrl(filePath);
}