/**
 * OCR (Optical Character Recognition) Library
 * Using Mistral AI's OCR API - handles both digital and scanned PDFs
 *
 * Supports: PDF, PNG, JPG, JPEG, GIF, WebP
 */

import fs from 'fs/promises';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';

const OCR_MODEL = 'mistral-ocr-latest';

// Initialize Mistral client
const mistralApiKey = process.env.MISTRAL_API_KEY;
if (!mistralApiKey) {
  console.warn('⚠️  MISTRAL_API_KEY not found in environment variables. OCR will not work.');
}
const client = mistralApiKey ? new Mistral({ apiKey: mistralApiKey }) : null;

// Supported file types for OCR
export const OCR_SUPPORTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

export const OCR_SUPPORTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
];

/**
 * Check if a file type is supported for OCR
 */
export function isOcrSupported(mimeType: string): boolean {
  return OCR_SUPPORTED_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Check if a file extension is supported for OCR
 */
export function isExtensionOcrSupported(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return OCR_SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Get human-readable list of supported formats
 */
export function getSupportedFormatsText(): string {
  return 'PDF, PNG, JPG, JPEG, GIF, WebP';
}

interface OcrResult {
  success: boolean;
  content?: string;
  error?: string;
  model: string;
  tokensUsed?: number;
  method?: 'mistral-ocr';
  pageCount?: number;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/pdf';
}

/**
 * Encode file to base64
 */
async function encodeFileToBase64(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return fileBuffer.toString('base64');
}

/**
 * Extract text from document using Mistral OCR
 * Works with both digital and scanned PDFs, as well as images
 */
export async function extractTextFromDocument(
  filePath: string,
  mimeType: string
): Promise<OcrResult> {
  // Check if Mistral client is initialized
  if (!client) {
    return {
      success: false,
      error: 'OCR service not configured. Please set MISTRAL_API_KEY environment variable.',
      model: 'none',
    };
  }

  // Check if file type is supported
  if (!isOcrSupported(mimeType)) {
    return {
      success: false,
      error: `File type ${mimeType} is not supported for OCR. Supported formats: ${getSupportedFormatsText()}`,
      model: 'none',
    };
  }

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch {
    return {
      success: false,
      error: 'File not found or not accessible',
      model: 'none',
    };
  }

  try {
    console.log(`🤖 Starting Mistral OCR: ${filePath}`);

    // Convert file to base64
    const base64File = await encodeFileToBase64(filePath);
    const detectedMimeType = getMimeType(filePath);

    console.log(`📄 Processing with Mistral OCR (${detectedMimeType})...`);

    // Process with Mistral OCR
    const ocrResponse = await client.ocr.process({
      model: OCR_MODEL,
      document: {
        type: 'document_url',
        documentUrl: `data:${detectedMimeType};base64,${base64File}`,
      },
      includeImageBase64: false, // Don't need embedded images for text extraction
    });

    // Extract text from all pages
    const extractedText = ocrResponse.pages
      .map((page: any, index: number) => {
        return `=== Page ${index + 1} ===\n\n${page.markdown}`;
      })
      .join('\n\n');

    const pageCount = ocrResponse.pages.length;
    const pagesProcessed = ocrResponse.usageInfo?.pagesProcessed || pageCount;

    console.log(`✅ Mistral OCR completed: ${extractedText.length} characters from ${pageCount} pages`);

    return {
      success: true,
      content: extractedText.trim(),
      model: OCR_MODEL,
      method: 'mistral-ocr',
      pageCount: pageCount,
      tokensUsed: pagesProcessed, // Using pages processed as a cost metric
    };
  } catch (error: any) {
    console.error('❌ Mistral OCR failed:', error);

    // Check for specific error types
    let errorMessage = error.message || 'OCR processing failed';

    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing Mistral API key. Please check your configuration.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('file size')) {
      errorMessage = 'File too large. Maximum file size is 50 MB.';
    } else if (error.message?.includes('pages')) {
      errorMessage = 'Document has too many pages. Maximum is 1000 pages.';
    }

    return {
      success: false,
      error: errorMessage,
      model: OCR_MODEL,
      method: 'mistral-ocr',
    };
  }
}

/**
 * Backward compatibility function for PDF extraction
 */
export async function extractTextFromPdf(filePath: string): Promise<OcrResult> {
  return extractTextFromDocument(filePath, 'application/pdf');
}

/**
 * Backward compatibility function for image extraction
 */
export async function extractTextFromImage(
  filePath: string,
  mimeType: string
): Promise<OcrResult> {
  return extractTextFromDocument(filePath, mimeType);
}

/**
 * Get OCR status badge information
 */
export function getOcrStatusInfo(status: string | null | undefined): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'pending':
      return { label: 'OCR Pending', color: 'bg-yellow-100 text-yellow-800' };
    case 'processing':
      return {
        label: 'OCR Processing...',
        color: 'bg-blue-100 text-blue-800 animate-pulse',
      };
    case 'completed':
      return { label: 'OCR Completed', color: 'bg-green-100 text-green-800' };
    case 'failed':
      return { label: 'OCR Failed', color: 'bg-red-100 text-red-800' };
    case 'not_supported':
      return {
        label: 'OCR Not Supported',
        color: 'bg-gray-100 text-gray-800',
      };
    default:
      return { label: 'No OCR', color: 'bg-gray-100 text-gray-800' };
  }
}
