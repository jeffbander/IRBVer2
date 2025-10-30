/**
 * File Upload Security Validation
 * HIPAA-compliant file upload validation with content verification
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFileName?: string;
}

// Allowed MIME types with corresponding file extensions
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

// File magic numbers (file signatures) for content verification
export const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG signature
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG with JFIF
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG with EXIF
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG
  ],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4B, 0x03, 0x04], // ZIP signature (DOCX is ZIP-based)
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    [0x50, 0x4B, 0x03, 0x04], // ZIP signature (XLSX is ZIP-based)
  ],
};

// Maximum file sizes by type (in bytes)
export const MAX_FILE_SIZES: Record<string, number> = {
  'application/pdf': 20 * 1024 * 1024, // 20MB for PDFs
  'application/msword': 10 * 1024 * 1024, // 10MB for DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 10 * 1024 * 1024, // 10MB for DOCX
  'application/vnd.ms-excel': 10 * 1024 * 1024, // 10MB for XLS
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 10 * 1024 * 1024, // 10MB for XLSX
  'text/plain': 1 * 1024 * 1024, // 1MB for text
  'image/jpeg': 5 * 1024 * 1024, // 5MB for JPEG
  'image/png': 5 * 1024 * 1024, // 5MB for PNG
};

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path components
  const baseName = fileName.replace(/^.*[\\\/]/, '');

  // Remove or replace dangerous characters
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length

  // Ensure the file has an extension
  if (!sanitized.includes('.')) {
    return `${sanitized}.bin`;
  }

  return sanitized;
}

/**
 * Validate file extension matches declared MIME type
 */
export function validateFileExtension(fileName: string, mimeType: string): boolean {
  const allowedExtensions = ALLOWED_FILE_TYPES[mimeType];
  if (!allowedExtensions) return false;

  const extension = '.' + fileName.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(extension);
}

/**
 * Verify file content matches declared MIME type using magic numbers
 */
export async function verifyFileSignature(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<boolean> {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) {
    // If we don't have signatures for this type, skip verification
    return true;
  }

  const bytes = new Uint8Array(buffer.slice(0, 20)); // Check first 20 bytes

  return signatures.some(signature => {
    return signature.every((byte, index) => bytes[index] === byte);
  });
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File
): Promise<FileValidationResult> {
  // 1. Validate MIME type is allowed
  if (!ALLOWED_FILE_TYPES[file.type]) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: PDF, Word, Excel, Text, Images (JPEG, PNG)`,
    };
  }

  // 2. Validate file size
  const maxSize = MAX_FILE_SIZES[file.type] || 10 * 1024 * 1024; // Default 10MB
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB for ${file.type}`,
    };
  }

  // 3. Validate minimum file size (non-empty file)
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // 4. Sanitize filename
  const sanitizedFileName = sanitizeFileName(file.name);
  if (sanitizedFileName.length === 0) {
    return {
      valid: false,
      error: 'Invalid filename',
    };
  }

  // 5. Validate file extension matches MIME type
  if (!validateFileExtension(sanitizedFileName, file.type)) {
    return {
      valid: false,
      error: `File extension does not match declared type ${file.type}`,
    };
  }

  // 6. Verify file content using magic numbers
  try {
    const buffer = await file.slice(0, 20).arrayBuffer();
    const signatureValid = await verifyFileSignature(buffer, file.type);

    if (!signatureValid) {
      return {
        valid: false,
        error: 'File content does not match declared file type (possible file spoofing attempt)',
      };
    }
  } catch (error) {
    console.error('Error verifying file signature:', error);
    return {
      valid: false,
      error: 'Failed to verify file content',
    };
  }

  // 7. Check for dangerous filenames
  const dangerousPatterns = [
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i, // Windows reserved names
    /^\./,  // Hidden files
    /\.(exe|bat|cmd|sh|ps1|vbs|js|jar|app|dmg)$/i, // Executable extensions
  ];

  if (dangerousPatterns.some(pattern => pattern.test(sanitizedFileName))) {
    return {
      valid: false,
      error: 'Filename contains dangerous patterns or extensions',
    };
  }

  return {
    valid: true,
    sanitizedFileName,
  };
}

/**
 * Placeholder for virus scanning integration
 * In production, integrate with ClamAV or similar
 */
export async function scanFileForViruses(
  filePath: string
): Promise<{ clean: boolean; threat?: string }> {
  // TODO: Integrate with ClamAV or cloud-based virus scanning service
  // For now, return clean (but log a warning)
  console.warn('⚠️ Virus scanning not implemented. Integrate ClamAV for production use.');

  return { clean: true };
}

/**
 * Generate secure random filename
 */
export function generateSecureFileName(originalFileName: string): string {
  const sanitized = sanitizeFileName(originalFileName);
  const extension = sanitized.substring(sanitized.lastIndexOf('.'));
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);

  return `${timestamp}-${random}${extension}`;
}
