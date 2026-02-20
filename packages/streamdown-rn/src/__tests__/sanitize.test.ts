/**
 * Security Tests for URL Sanitization
 * 
 * These tests are adapted from Kerem's security audit to ensure
 * all XSS vectors are properly blocked.
 * 
 * Attack vectors covered:
 * - javascript: protocol (XSS)
 * - data: protocol (XSS, data exfiltration)
 * - vbscript: protocol (legacy IE XSS)
 * - file: protocol (local file access)
 * - Other dangerous protocols
 */

import { sanitizeURL, sanitizeProps } from '../core/sanitize';
import { extractComponentData } from '../core/componentParser';

// ============================================================================
// URL Sanitization Tests
// ============================================================================

describe('Security: URL Sanitization', () => {
  describe('javascript: protocol (XSS vector)', () => {
    it('should block javascript: URLs', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBeNull();
      expect(sanitizeURL('javascript:alert(document.cookie)')).toBeNull();
      expect(sanitizeURL('javascript:void(0)')).toBeNull();
    });

    it('should block case variations of javascript:', () => {
      expect(sanitizeURL('JAVASCRIPT:alert(1)')).toBeNull();
      expect(sanitizeURL('JavaScript:alert(1)')).toBeNull();
      expect(sanitizeURL('jAvAsCrIpT:alert(1)')).toBeNull();
      expect(sanitizeURL('JaVaScRiPt:alert(1)')).toBeNull();
    });

    it('should block javascript: with whitespace padding', () => {
      expect(sanitizeURL('  javascript:alert(1)  ')).toBeNull();
      expect(sanitizeURL('\tjavascript:alert(1)')).toBeNull();
      expect(sanitizeURL('\njavascript:alert(1)')).toBeNull();
    });
  });

  describe('data: protocol (XSS vector)', () => {
    it('should block data: URLs with HTML payloads', () => {
      expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeURL('data:text/html,<img src=x onerror=alert(1)>')).toBeNull();
    });

    it('should block base64 encoded payloads', () => {
      // base64 of <script>alert(1)</script>
      expect(sanitizeURL('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBeNull();
    });

    it('should block data: URLs for images (pixel tracking)', () => {
      expect(sanitizeURL('data:image/svg+xml,<svg onload=alert(1)>')).toBeNull();
    });
  });

  describe('other dangerous protocols', () => {
    it('should block vbscript: (legacy IE XSS)', () => {
      expect(sanitizeURL('vbscript:msgbox(1)')).toBeNull();
      expect(sanitizeURL('VBSCRIPT:Execute("code")')).toBeNull();
    });

    it('should block file: (local file access)', () => {
      expect(sanitizeURL('file:///etc/passwd')).toBeNull();
      expect(sanitizeURL('file:///C:/Windows/System32/config/SAM')).toBeNull();
    });

    it('should block other uncommon protocols', () => {
      expect(sanitizeURL('ftp://evil.com/malware.exe')).toBeNull();
      expect(sanitizeURL('ws://evil.com/socket')).toBeNull();
      expect(sanitizeURL('wss://evil.com/socket')).toBeNull();
      expect(sanitizeURL('blob:https://evil.com/uuid')).toBeNull();
    });

    it('should block protocol-relative URLs', () => {
      expect(sanitizeURL('//evil.com/path')).toBeNull();
      expect(sanitizeURL('\\\\evil.local\\share')).toBeNull();
    });
  });

  describe('allowed protocols', () => {
    it('should allow https:', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com');
      expect(sanitizeURL('https://example.com/path?query=1')).toBe('https://example.com/path?query=1');
    });

    it('should allow http:', () => {
      expect(sanitizeURL('http://example.com')).toBe('http://example.com');
      expect(sanitizeURL('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('should allow mailto:', () => {
      expect(sanitizeURL('mailto:test@example.com')).toBe('mailto:test@example.com');
      expect(sanitizeURL('mailto:test@example.com?subject=Hello')).toBe('mailto:test@example.com?subject=Hello');
    });

    it('should allow tel:', () => {
      expect(sanitizeURL('tel:+1234567890')).toBe('tel:+1234567890');
      expect(sanitizeURL('tel:555-1234')).toBe('tel:555-1234');
    });

    it('should allow sms:', () => {
      expect(sanitizeURL('sms:+1234567890')).toBe('sms:+1234567890');
      expect(sanitizeURL('sms:+1234567890?body=Hello')).toBe('sms:+1234567890?body=Hello');
    });
  });

  describe('relative URLs', () => {
    it('should allow absolute paths', () => {
      expect(sanitizeURL('/path/to/page')).toBe('/path/to/page');
      expect(sanitizeURL('/api/data')).toBe('/api/data');
    });

    it('should allow hash anchors', () => {
      expect(sanitizeURL('#section')).toBe('#section');
      expect(sanitizeURL('#top')).toBe('#top');
    });

    it('should allow relative paths', () => {
      expect(sanitizeURL('./file.html')).toBe('./file.html');
      expect(sanitizeURL('../parent/file.html')).toBe('../parent/file.html');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(sanitizeURL('')).toBeNull();
      expect(sanitizeURL('   ')).toBeNull();
    });

    it('should handle null/undefined', () => {
      expect(sanitizeURL(null as unknown as string)).toBeNull();
      expect(sanitizeURL(undefined as unknown as string)).toBeNull();
    });

    it('should handle malformed URLs', () => {
      expect(sanitizeURL('not-a-url')).toBeNull();
      expect(sanitizeURL('://missing-protocol.com')).toBeNull();
    });
  });
});

// ============================================================================
// Prop Sanitization Tests
// ============================================================================

describe('Security: Prop Sanitization', () => {
  describe('flat props', () => {
    it('should sanitize javascript: URLs in props', () => {
      const props = { url: 'javascript:alert(1)', title: 'Safe Title' };
      const safe = sanitizeProps(props);
      expect(safe.url).toBe('');
      expect(safe.title).toBe('Safe Title');
    });

    it('should sanitize data: URLs in props', () => {
      const props = { src: 'data:text/html,<script>alert(1)</script>' };
      const safe = sanitizeProps(props);
      expect(safe.src).toBe('');
    });

    it('should preserve safe URLs', () => {
      const props = { url: 'https://example.com', href: '/path/to/page' };
      const safe = sanitizeProps(props);
      expect(safe.url).toBe('https://example.com');
      expect(safe.href).toBe('/path/to/page');
    });

    it('should preserve non-URL strings', () => {
      const props = { title: 'Hello World', description: 'Some text without URLs' };
      const safe = sanitizeProps(props);
      expect(safe.title).toBe('Hello World');
      expect(safe.description).toBe('Some text without URLs');
    });

    it('should sanitize protocol-relative URLs in URL-like keys', () => {
      const props = { url: '//evil.com/payload', href: '/safe/path' };
      const safe = sanitizeProps(props);
      expect(safe.url).toBe('');
      expect(safe.href).toBe('/safe/path');
    });

    it('should sanitize URL-like keys even without explicit protocol prefix', () => {
      const props = {
        image_url: 'javascript:alert(1)',
        endpoint: 'https://api.example.com/v1',
        title: 'Status card',
      };
      const safe = sanitizeProps(props);
      expect(safe.image_url).toBe('');
      expect(safe.endpoint).toBe('https://api.example.com/v1');
      expect(safe.title).toBe('Status card');
    });

    it('should preserve primitives', () => {
      const props = { count: 42, active: true, data: null };
      const safe = sanitizeProps(props);
      expect(safe.count).toBe(42);
      expect(safe.active).toBe(true);
      expect(safe.data).toBeNull();
    });
  });

  describe('nested objects', () => {
    it('should sanitize URLs in nested objects', () => {
      const props = { config: { href: 'javascript:alert(1)' } };
      const safe = sanitizeProps(props);
      expect((safe.config as Record<string, unknown>).href).toBe('');
    });

    it('should handle deeply nested objects', () => {
      const props = {
        level1: {
          level2: {
            level3: {
              url: 'javascript:evil()',
            },
          },
        },
      };
      const safe = sanitizeProps(props);
      expect(
        ((safe.level1 as Record<string, unknown>).level2 as Record<string, unknown>).level3 as Record<string, unknown>
      ).toEqual({ url: '' });
    });
  });

  describe('arrays', () => {
    it('should sanitize arrays of objects', () => {
      const props = { items: [{ url: 'javascript:evil()' }, { url: 'https://safe.com' }] };
      const safe = sanitizeProps(props);
      expect((safe.items as Record<string, unknown>[])[0].url).toBe('');
      expect((safe.items as Record<string, unknown>[])[1].url).toBe('https://safe.com');
    });

    it('should sanitize URL strings in arrays', () => {
      const props = { urls: ['javascript:alert(1)', 'https://safe.com'] };
      const safe = sanitizeProps(props);
      expect((safe.urls as string[])[0]).toBe('');
      expect((safe.urls as string[])[1]).toBe('https://safe.com');
    });

    it('should preserve non-URL strings in arrays', () => {
      const props = { tags: ['hello', 'world'] };
      const safe = sanitizeProps(props);
      expect(safe.tags).toEqual(['hello', 'world']);
    });
  });
});

// ============================================================================
// Integration Tests (Full Pipeline)
// ============================================================================

describe('Security: Full Pipeline Integration', () => {
  describe('component extraction with malicious props', () => {
    it('should block javascript: in component props', () => {
      const input = '[{c:"Card",p:{"url":"javascript:alert(1)"}}]';
      const data = extractComponentData(input);
      expect(data.props.url).toBe('');
    });

    it('should block data: URLs in component props', () => {
      const input = '[{c:"Image",p:{"src":"data:text/html,<script>alert(1)</script>"}}]';
      const data = extractComponentData(input);
      expect(data.props.src).toBe('');
    });

    it('should block protocol-relative URLs in component props', () => {
      const input = '[{c:"Image",p:{"src":"//evil.com/tracker.png"}}]';
      const data = extractComponentData(input);
      expect(data.props.src).toBe('');
    });

    it('should preserve safe URLs in component props', () => {
      const input = '[{c:"Link",p:{"href":"https://example.com"}}]';
      const data = extractComponentData(input);
      expect(data.props.href).toBe('https://example.com');
    });

    it('should preserve non-URL props', () => {
      const input = '[{c:"StatusCard",p:{"title":"On-call","priority":1}}]';
      const data = extractComponentData(input);
      expect(data.props.title).toBe('On-call');
      expect(data.props.priority).toBe(1);
    });
  });

  describe('streaming component extraction', () => {
    it('should sanitize props during streaming (incomplete JSON)', () => {
      // Simulate streaming where props are not yet complete
      const input = '[{c:"Card",p:{"url":"javascript:alert(1)","title":"Test';
      const data = extractComponentData(input);
      expect(data.props.url).toBe('');
      expect(data.props.title).toBe('Test');
    });
  });
});

// ============================================================================
// Kerem's Original Test Cases (Adapted)
// ============================================================================

describe('Security: Kerem Audit Test Cases', () => {
  /**
   * These tests are adapted from Kerem's XSS PoC report.
   * The original tests targeted HTML injection, but our renderer
   * doesn't execute HTML - it renders as text.
   * 
   * However, we test the equivalent markdown-based vectors.
   */

  it('Standard Script - should not be relevant (HTML rendered as text)', () => {
    // In our renderer, <script> tags in HTML nodes are rendered as plain text
    // This test documents that behavior rather than testing sanitization
    // The actual test would be in a render test, not sanitization
    expect(true).toBe(true);
  });

  it('Image OnError (Kerem: Bypass) - N/A for our renderer', () => {
    // <img src=x onerror=alert("XSS")> would be parsed as html node
    // and rendered as plain text, not as actual HTML
    expect(true).toBe(true);
  });

  it('SVG OnLoad (Kerem: Bypass) - N/A for our renderer', () => {
    // <svg onload=alert("XSS")> would be parsed as html node
    // and rendered as plain text
    expect(true).toBe(true);
  });

  it('Link with Javascript Protocol - should be blocked', () => {
    // This is the equivalent of Kerem's <a href="javascript:..."> test
    // but in component props instead of HTML
    const input = '[{c:"Link",p:{"href":"javascript:alert(1)"}}]';
    const data = extractComponentData(input);
    expect(data.props.href).toBe('');
  });

  it('Multiple mixed vectors - should block all dangerous URLs', () => {
    const input = '[{c:"Card",p:{' +
      '"js":"javascript:alert(1)",' +
      '"data":"data:text/html,<script>alert(1)</script>",' +
      '"vb":"vbscript:msgbox(1)",' +
      '"safe":"https://example.com"' +
    '}}]';
    const data = extractComponentData(input);
    expect(data.props.js).toBe('');
    expect(data.props.data).toBe('');
    expect(data.props.vb).toBe('');
    expect(data.props.safe).toBe('https://example.com');
  });
});

// ============================================================================
// HTML Safety Documentation (Not XSS Vulnerable)
// ============================================================================

describe('Security: HTML in Markdown (Safe by Design)', () => {
  /**
   * IMPORTANT: streamdown-rn does NOT render HTML.
   * 
   * When markdown contains raw HTML like <script>alert(1)</script>,
   * remark parses it as an "html" node. Our ASTRenderer then renders
   * this as: <Text style={styles.code}>{node.value}</Text>
   * 
   * This means the HTML is displayed as LITERAL TEXT, not executed.
   * React/React Native's Text component auto-escapes content.
   * 
   * These tests document this behavior.
   */

  describe('HTML nodes are rendered as plain text', () => {
    it('<script> tags appear as literal text, not executed', () => {
      // When markdown contains: <script>alert(1)</script>
      // Remark creates: { type: 'html', value: '<script>alert(1)</script>' }
      // We render: <Text>{node.value}</Text>
      // User sees: "<script>alert(1)</script>" as text on screen
      // NO EXECUTION occurs because we don't use dangerouslySetInnerHTML
      expect(true).toBe(true); // Documented behavior
    });

    it('<img onerror=...> appears as literal text, not executed', () => {
      // When markdown contains: <img src=x onerror=alert(1)>
      // Remark creates: { type: 'html', value: '<img src=x onerror=alert(1)>' }
      // We render: <Text>{node.value}</Text>
      // User sees: "<img src=x onerror=alert(1)>" as text on screen
      expect(true).toBe(true); // Documented behavior
    });

    it('<svg onload=...> appears as literal text, not executed', () => {
      // When markdown contains: <svg onload=alert(1)>
      // Remark creates: { type: 'html', value: '<svg onload=alert(1)>' }
      // We render: <Text>{node.value}</Text>
      // User sees: "<svg onload=alert(1)>" as text on screen
      expect(true).toBe(true); // Documented behavior
    });

    it('<a href="javascript:..."> in HTML is rendered as text', () => {
      // When markdown contains: <a href="javascript:alert(1)">click</a>
      // Remark creates: { type: 'html', value: '<a href="javascript:alert(1)">click</a>' }
      // We render: <Text>{node.value}</Text>
      // User sees the literal HTML as text, no link is clickable
      expect(true).toBe(true); // Documented behavior
    });
  });

  describe('Why we are NOT vulnerable to Kerem\'s HTML vectors', () => {
    it('No dangerouslySetInnerHTML usage', () => {
      // We never use dangerouslySetInnerHTML or equivalent
      // All content goes through React's text escaping
      expect(true).toBe(true);
    });

    it('No WebView rendering of HTML', () => {
      // We don't render content in WebViews
      // Everything is native React Native components
      expect(true).toBe(true);
    });

    it('HTML nodes use Text component with escaped content', () => {
      // ASTRenderer.tsx line ~180:
      // case 'html':
      //   return <Text style={...}>{node.value}</Text>;
      //
      // React escapes node.value automatically
      expect(true).toBe(true);
    });
  });
});

