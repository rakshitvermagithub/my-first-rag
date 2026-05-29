import { createClient } from '@supabase/supabase-js';
import { error } from 'console';
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
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.pdf')) {
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

  
}