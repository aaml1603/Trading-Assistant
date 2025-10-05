export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

export async function validateFileType(file: File): Promise<FileValidationResult> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Validate PDF files
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    // Check PDF magic number: %PDF
    if (bytes.length < 4 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
      return {
        valid: false,
        error: 'Invalid PDF file. File does not match PDF format.',
      };
    }
    return { valid: true };
  }

  // Validate image files
  if (file.type.startsWith('image/')) {
    const isPNG = bytes.length >= 8 &&
                  bytes[0] === 0x89 && bytes[1] === 0x50 &&
                  bytes[2] === 0x4E && bytes[3] === 0x47;

    const isJPEG = bytes.length >= 2 &&
                   bytes[0] === 0xFF && bytes[1] === 0xD8 &&
                   bytes[bytes.length - 2] === 0xFF && bytes[bytes.length - 1] === 0xD9;

    const isGIF = bytes.length >= 6 &&
                  bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;

    const isWebP = bytes.length >= 12 &&
                   bytes[0] === 0x52 && bytes[1] === 0x49 &&
                   bytes[2] === 0x46 && bytes[3] === 0x46 &&
                   bytes[8] === 0x57 && bytes[9] === 0x45 &&
                   bytes[10] === 0x42 && bytes[11] === 0x50;

    if (!isPNG && !isJPEG && !isGIF && !isWebP) {
      return {
        valid: false,
        error: 'Invalid image file. Only PNG, JPEG, GIF, and WebP formats are supported.',
      };
    }
    return { valid: true };
  }

  // Validate text files (from Notion)
  if (file.type === 'text/plain') {
    // Basic validation for text files
    try {
      const text = await file.text();
      // Check if it's valid UTF-8
      if (text.length === 0) {
        return {
          valid: false,
          error: 'Text file is empty.',
        };
      }
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid text file encoding.',
      };
    }
  }

  return {
    valid: false,
    error: `Unsupported file type: ${file.type}`,
  };
}

export async function validateFile(file: File): Promise<FileValidationResult> {
  // Check size first (faster)
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }

  // Then check file type (slower due to reading)
  return await validateFileType(file);
}
