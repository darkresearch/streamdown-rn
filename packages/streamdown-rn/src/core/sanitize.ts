/**
 * URL Security Sanitization
 * 
 * Protects against XSS via malicious URL protocols in:
 * - Component props
 * - Markdown links
 * - Images
 * 
 * Uses a strict ALLOWLIST approach - only explicitly allowed protocols pass.
 * This is more secure than blocklists which can be bypassed.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Protocols that are safe to allow.
 * Everything else is blocked.
 */
const ALLOWED_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'tel:',
  'sms:',
]);

// ============================================================================
// URL Sanitization
// ============================================================================

/**
 * Sanitize a URL by checking against allowed protocols.
 * 
 * @param url - URL to sanitize
 * @returns The original URL if safe, null if dangerous
 * 
 * @example
 * sanitizeURL('https://example.com')     // 'https://example.com'
 * sanitizeURL('javascript:alert(1)')     // null
 * sanitizeURL('/relative/path')          // '/relative/path'
 * sanitizeURL('data:text/html,...')      // null
 */
export function sanitizeURL(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  const trimmed = url.trim();
  
  if (trimmed.length === 0) {
    return null;
  }

  // Block protocol-relative and UNC paths (can bypass protocol allowlists)
  if (trimmed.startsWith('//') || trimmed.startsWith('\\\\')) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[streamdown-rn] Blocked protocol-relative URL');
    }
    return null;
  }
  
  // Allow relative URLs - they're safe
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return url;
  }
  
  // Parse and check protocol
  try {
    const parsed = new URL(trimmed);
    
    if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return url;
    }
    
    // Protocol not in allowlist - block it
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[streamdown-rn] Blocked URL with disallowed protocol: ${parsed.protocol}`);
    }
    return null;
  } catch {
    // Invalid URL - could be a protocol-relative URL or malformed
    // Be conservative and block it
    return null;
  }
}

// ============================================================================
// Prop Sanitization
// ============================================================================

/**
 * Check if a string looks like a URL (has a protocol).
 * Only strings that look like URLs need sanitization.
 */
function looksLikeURL(value: string): boolean {
  // Match strings that start with a protocol-like pattern: word followed by colon
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Check if a prop key is likely intended to carry a URL.
 */
function isLikelyURLKey(key: string): boolean {
  return /(?:^|_)(?:url|uri|href|src|link|website|endpoint|avatar|image)(?:$|_)/i.test(key);
}

/**
 * Decide whether a prop string should be URL-sanitized.
 */
function shouldSanitizeStringProp(key: string, value: string): boolean {
  return isLikelyURLKey(key) || looksLikeURL(value);
}

/**
 * Recursively sanitize component props.
 * 
 * Checks all string values that look like URLs and sanitizes them.
 * Preserves all other values unchanged.
 * 
 * @param props - Props object to sanitize
 * @returns Sanitized props with dangerous URLs replaced with empty strings
 * 
 * @example
 * sanitizeProps({ url: 'javascript:alert(1)', title: 'Safe' })
 * // { url: '', title: 'Safe' }
 */
export function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      // Sanitize known URL props and protocol-like strings
      if (shouldSanitizeStringProp(key, value)) {
        const safeUrl = sanitizeURL(value);
        result[key] = safeUrl ?? '';
      } else {
        result[key] = value;
      }
    } else if (Array.isArray(value)) {
      // Recursively sanitize arrays
      result[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return sanitizeProps(item as Record<string, unknown>);
        }
        if (typeof item === 'string' && (isLikelyURLKey(key) || looksLikeURL(item))) {
          return sanitizeURL(item) ?? '';
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      result[key] = sanitizeProps(value as Record<string, unknown>);
    } else {
      // Preserve primitives (numbers, booleans, null)
      result[key] = value;
    }
  }
  
  return result;
}

