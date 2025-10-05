export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 12) {
    return {
      valid: false,
      error: 'Password must be at least 12 characters long'
    };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long (max 128 characters)' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUpper || !hasLower || !hasNumber) {
    return {
      valid: false,
      error: 'Password must contain uppercase letters, lowercase letters, and numbers'
    };
  }

  return { valid: true };
}

export function sanitizeString(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

export function validateConversationTitle(title: string): { valid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required' };
  }

  const sanitized = sanitizeString(title, 200);
  if (sanitized.length === 0) {
    return { valid: false, error: 'Title cannot be empty' };
  }

  if (sanitized.length > 200) {
    return { valid: false, error: 'Title is too long (max 200 characters)' };
  }

  return { valid: true };
}

export function validateCustomInstructions(instructions: string): { valid: boolean; error?: string } {
  if (typeof instructions !== 'string') {
    return { valid: false, error: 'Instructions must be a string' };
  }

  const sanitized = sanitizeString(instructions, 5000);

  if (sanitized.length > 5000) {
    return { valid: false, error: 'Instructions are too long (max 5000 characters)' };
  }

  return { valid: true };
}

export function validateUrl(url: string, allowedDomains?: string[]): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }

    // Check allowed domains if specified
    if (allowedDomains && allowedDomains.length > 0) {
      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowed = allowedDomains.some(domain => {
        const domainLower = domain.toLowerCase();
        return hostname === domainLower || hostname.endsWith('.' + domainLower);
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `URL must be from one of these domains: ${allowedDomains.join(', ')}`
        };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}
