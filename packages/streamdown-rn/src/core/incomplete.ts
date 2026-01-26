/**
 * Incomplete Markdown Handler
 * 
 * Provides "format-as-you-type" UX by:
 * 1. Tracking open markdown tags in a state stack
 * 2. Auto-closing incomplete tags for rendering
 * 3. Hiding markers that have no content yet
 * 
 * Optimized for incremental updates during streaming.
 */

import type { IncompleteTagState } from './types';

// ============================================================================
// Constants
// ============================================================================

export const INITIAL_INCOMPLETE_STATE: IncompleteTagState = {
  stack: [],
  tagCounts: {},
  previousTextLength: 0,
  earliestPosition: 0,
  inCodeBlock: false,
  inInlineCode: false,
  inMathBlock: false,
  inInlineMath: false,
};

// ============================================================================
// Helper Functions (DRY)
// ============================================================================

/**
 * Find and remove a tag from the stack
 */
function removeTagFromStack(
  stack: IncompleteTagState['stack'],
  tagCounts: Record<string, number>,
  type: string
): boolean {
  const idx = stack.findIndex(t => t.type === type);
  if (idx !== -1) {
    stack.splice(idx, 1);
    tagCounts[type] = Math.max(0, (tagCounts[type] || 0) - 1);
    return true;
  }
  return false;
}

/**
 * Add a tag to the stack
 */
function addTagToStack(
  stack: IncompleteTagState['stack'],
  tagCounts: Record<string, number>,
  type: string,
  position: number,
  marker: string,
  earliestPosition: number
): number {
  stack.push({ type, position, marker });
  tagCounts[type] = (tagCounts[type] || 0) + 1;
  return earliestPosition === 0 ? position : earliestPosition;
}

/**
 * Check if text ends with a pattern (for detecting partial closers)
 */
function endsWithPartialMarker(text: string, partial: string, full: string): boolean {
  return text.endsWith(partial) && !text.endsWith(full);
}

/**
 * Extract trailing whitespace from text.
 * Markdown closers must come before whitespace to parse correctly.
 * e.g., "**bold " needs to become "**bold** " not "**bold **"
 * 
 * Only extracts spaces/tabs, NOT newlines - newlines are significant
 * for block-level markdown (code blocks, lists, etc.)
 */
function extractTrailingWhitespace(text: string): { content: string; whitespace: string } {
  // Only extract spaces and tabs, not newlines
  const match = text.match(/([ \t]+)$/);
  if (match) {
    return {
      content: text.slice(0, -match[1].length),
      whitespace: match[1],
    };
  }
  return { content: text, whitespace: '' };
}

// ============================================================================
// Character Classification Helpers (ported from remend)
// ============================================================================

/**
 * Unicode-aware word character check.
 * ASCII fast path for performance, regex fallback for Unicode.
 * Used for word-internal marker detection (e.g., hello_world should NOT be italic).
 */
const UNICODE_WORD_CHAR = /[\p{L}\p{N}_]/u;

function isWordChar(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  // ASCII fast path: a-z, A-Z, 0-9, _
  if (
    (code >= 48 && code <= 57) ||   // 0-9
    (code >= 65 && code <= 90) ||   // A-Z
    (code >= 97 && code <= 122) ||  // a-z
    code === 95                      // _
  ) {
    return true;
  }
  return UNICODE_WORD_CHAR.test(char);
}

/**
 * Check if a line containing a marker is a horizontal rule.
 * Horizontal rules are lines with 3+ of the same marker (star, dash, or underscore)
 * with only optional spaces and tabs between them.
 */
function isHorizontalRuleLine(fullText: string, position: number, marker: string): boolean {
  // Find line start
  let lineStart = 0;
  for (let i = position - 1; i >= 0; i--) {
    if (fullText[i] === '\n') {
      lineStart = i + 1;
      break;
    }
  }
  
  // Find line end
  let lineEnd = fullText.length;
  for (let i = position; i < fullText.length; i++) {
    if (fullText[i] === '\n') {
      lineEnd = i;
      break;
    }
  }
  
  const line = fullText.substring(lineStart, lineEnd);
  
  let markerCount = 0;
  for (const char of line) {
    if (char === marker) {
      markerCount++;
    } else if (char !== ' ' && char !== '\t') {
      return false; // Non-whitespace, non-marker character
    }
  }
  
  return markerCount >= 3;
}

/**
 * Check if an asterisk at the given position is a list marker.
 * A list marker is * followed by space/tab at the start of a line (with optional indentation).
 */
function isAsteriskListMarker(fullText: string, position: number): boolean {
  const nextChar = position < fullText.length - 1 ? fullText[position + 1] : '';
  if (nextChar !== ' ' && nextChar !== '\t') {
    return false;
  }
  
  // Find start of current line
  let lineStart = 0;
  for (let i = position - 1; i >= 0; i--) {
    if (fullText[i] === '\n') {
      lineStart = i + 1;
      break;
    }
  }
  
  // Check if everything before the * on this line is whitespace
  for (let i = lineStart; i < position; i++) {
    if (fullText[i] !== ' ' && fullText[i] !== '\t') {
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// State Management
// ============================================================================

/**
 * Update tag state based on new text.
 * Only processes new characters since last update.
 * 
 * @param state - Current state
 * @param fullText - Complete text (all tokens so far)
 * @returns Updated state
 */
export function updateTagState(
  state: IncompleteTagState,
  fullText: string
): IncompleteTagState {
  // Handle text shrinking (unlikely in AI responses, but handle it)
  if (fullText.length < state.previousTextLength) {
    return rebuildTagState(fullText);
  }
  
  // No new content
  if (fullText.length === state.previousTextLength) {
    return state;
  }
  
  // For simplicity and correctness, rebuild from scratch
  // This is fast enough for typical streaming (< 1ms for ~10KB)
  return rebuildTagState(fullText);
}

/**
 * Rebuild state from scratch using token-based scanning
 * This properly handles multi-character markers like ** and ```
 */
function rebuildTagState(fullText: string): IncompleteTagState {
  const stack: IncompleteTagState['stack'] = [];
  const tagCounts: Record<string, number> = {};
  let earliestPosition = 0;
  let inCodeBlock = false;
  let inInlineCode = false;
  let inMathBlock = false;
  let inInlineMath = false;
  let inComponent = false;  // Track if we're inside a component [{...}]
  let componentBraceDepth = 0;  // Track nested braces inside component
  
  let i = 0;
  while (i < fullText.length) {
    // === Code block: ``` (must check first, before inline code) ===
    if (fullText.slice(i, i + 3) === '```') {
      if (inCodeBlock) {
        // Close code block
        removeTagFromStack(stack, tagCounts, 'codeBlock');
        inCodeBlock = false;
      } else {
        // Open code block
        earliestPosition = addTagToStack(stack, tagCounts, 'codeBlock', i, '```', earliestPosition);
        inCodeBlock = true;
      }
      i += 3;
      continue;
    }
    
    // === Two backticks at end (pending) ===
    // This handles BOTH:
    // 1. Outside code block: `` is building toward opening ```
    // 2. Inside code block: `` is building toward closing ```
    if (fullText.slice(i, i + 2) === '``' && i + 2 === fullText.length) {
      // Track as pending - will be hidden by hideIncompleteMarkers
      earliestPosition = addTagToStack(stack, tagCounts, 'pendingCodeBlock', i, '``', earliestPosition);
      i += 2;
      continue;
    }
    
    // === Single backtick at end inside code block ===
    // Could be building toward closing ```, hide it
    if (inCodeBlock && fullText[i] === '`' && i + 1 === fullText.length) {
      // Track as pending single backtick inside code block
      earliestPosition = addTagToStack(stack, tagCounts, 'pendingBacktick', i, '`', earliestPosition);
      i++;
      continue;
    }
    
    // Skip everything else inside code blocks
    if (inCodeBlock) {
      i++;
      continue;
    }
    
    // === Backslash escape: \* \_ \~ \` \$ \[ \! etc. ===
    // Skip the next character — it's escaped and not a marker
    if (fullText[i] === '\\' && i + 1 < fullText.length) {
      const nextChar = fullText[i + 1];
      // Only skip if it's escaping a markdown-significant character
      if ('*_~`$[]!\\'.includes(nextChar)) {
        i += 2;
        continue;
      }
    }
    
    // === Component detection: [{ ===
    // When we see [{, we're entering component DSL - skip markdown processing
    if (fullText.slice(i, i + 2) === '[{') {
      inComponent = true;
      componentBraceDepth = 1;  // The { after [
      i += 2;
      continue;
    }
    
    // Track braces inside component to know when we exit
    if (inComponent) {
      // Check for closing }] BEFORE updating depth
      // Component is complete when we see }] at depth 1 (the outermost brace)
      if (fullText.slice(i, i + 2) === '}]' && componentBraceDepth === 1) {
        inComponent = false;
        componentBraceDepth = 0;
        i += 2;
        continue;
      }
      
      // Track nested braces
      if (fullText[i] === '{') {
        componentBraceDepth++;
      } else if (fullText[i] === '}') {
        componentBraceDepth--;
      }
      
      // Skip all markdown processing inside components
      i++;
      continue;
    }
    
    // === Math block: $$ (must check before inline math) ===
    if (fullText.slice(i, i + 2) === '$$') {
      if (inMathBlock) {
        removeTagFromStack(stack, tagCounts, 'mathBlock');
        inMathBlock = false;
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'mathBlock', i, '$$', earliestPosition);
        inMathBlock = true;
      }
      i += 2;
      continue;
    }
    
    // === Inline math: $ ===
    if (fullText[i] === '$' && !inMathBlock) {
      if (inInlineMath) {
        removeTagFromStack(stack, tagCounts, 'inlineMath');
        inInlineMath = false;
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'inlineMath', i, '$', earliestPosition);
        inInlineMath = true;
      }
      i++;
      continue;
    }
    
    // Skip everything inside math blocks (no emphasis processing)
    if (inMathBlock || inInlineMath) {
      i++;
      continue;
    }
    
    // === Inline code: ` (single backtick, not part of ```) ===
    if (fullText[i] === '`') {
      if (inInlineCode) {
        removeTagFromStack(stack, tagCounts, 'code');
        inInlineCode = false;
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'code', i, '`', earliestPosition);
        inInlineCode = true;
      }
      i++;
      continue;
    }
    
    // Skip everything inside inline code
    if (inInlineCode) {
      i++;
      continue;
    }
    
    // === Bold underscore: __ (must check before single underscore) ===
    if (fullText.slice(i, i + 2) === '__') {
      // Skip word-internal: check char before first _ and after second _
      const prevChar = i > 0 ? fullText[i - 1] : '';
      const nextChar = i + 2 < fullText.length ? fullText[i + 2] : '';
      if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
        i += 2;
        continue;
      }
      
      const boldUnderIdx = stack.findIndex(t => t.type === 'boldUnderscore');
      if (boldUnderIdx !== -1) {
        removeTagFromStack(stack, tagCounts, 'boldUnderscore');
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'boldUnderscore', i, '__', earliestPosition);
      }
      i += 2;
      continue;
    }
    
    // === Italic underscore: _ (single, not part of __) ===
    if (fullText[i] === '_') {
      // Skip word-internal underscores (e.g., hello_world)
      const prevChar = i > 0 ? fullText[i - 1] : '';
      const nextChar = i + 1 < fullText.length ? fullText[i + 1] : '';
      if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
        i++;
        continue;
      }
      
      const italicUnderIdx = stack.findIndex(t => t.type === 'italicUnderscore');
      const boldUnderOpen = stack.some(t => t.type === 'boldUnderscore');
      const isLastChar = i === fullText.length - 1;
      
      // SPECIAL CASE: If bold underscore is open, italic is NOT open, and last char,
      // this _ is likely the start of closing __ (user still typing)
      if (boldUnderOpen && italicUnderIdx === -1 && isLastChar) {
        const boldTag = stack.find(t => t.type === 'boldUnderscore');
        const boldOpenerEnd = boldTag ? boldTag.position + 2 : 0;
        const hasContentBetween = i > boldOpenerEnd;
        if (hasContentBetween) {
          i++;
          continue;
        }
      }
      
      if (italicUnderIdx !== -1) {
        removeTagFromStack(stack, tagCounts, 'italicUnderscore');
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'italicUnderscore', i, '_', earliestPosition);
      }
      i++;
      continue;
    }
    
    // === Bold: ** (must check before italic) ===
    if (fullText.slice(i, i + 2) === '**') {
      const boldIdx = stack.findIndex(t => t.type === 'bold');
      if (boldIdx !== -1) {
        removeTagFromStack(stack, tagCounts, 'bold');
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'bold', i, '**', earliestPosition);
      }
      i += 2;
      continue;
    }
    
    // === Italic: * (single asterisk, not part of **) ===
    if (fullText[i] === '*') {
      // Skip if this is a list marker (* followed by space at line start)
      if (isAsteriskListMarker(fullText, i)) {
        i++;
        continue;
      }
      
      // Skip word-internal asterisks (e.g., file*name)
      const prevChar = i > 0 ? fullText[i - 1] : '';
      const nextChar = i + 1 < fullText.length ? fullText[i + 1] : '';
      if (prevChar && nextChar && isWordChar(prevChar) && isWordChar(nextChar)) {
        i++;
        continue;
      }
      
      const italicIdx = stack.findIndex(t => t.type === 'italic');
      const boldOpen = stack.some(t => t.type === 'bold');
      const isLastChar = i === fullText.length - 1;
      
      // SPECIAL CASE: If bold is open, italic is NOT open, and this is the last character,
      // this * is likely the start of the closing ** (user still typing).
      // BUT: if this * immediately follows the bold opener (i.e., ***), it's opening italic.
      if (boldOpen && italicIdx === -1 && isLastChar) {
        // Check if there's content between bold opener and this *
        const boldTag = stack.find(t => t.type === 'bold');
        const boldOpenerEnd = boldTag ? boldTag.position + 2 : 0; // ** is 2 chars
        const hasContentBetween = i > boldOpenerEnd;
        
        // Only skip if there's content (e.g., "**bold*" not "***")
        if (hasContentBetween) {
          i++;
          continue;
        }
      }
      
      if (italicIdx !== -1) {
        removeTagFromStack(stack, tagCounts, 'italic');
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'italic', i, '*', earliestPosition);
      }
      i++;
      continue;
    }
    
    // === Strikethrough: ~~ or ~ ===
    // Support both single and double tilde (remark-gfm parses both as strikethrough)
    if (fullText.slice(i, i + 2) === '~~') {
      const strikeIdx = stack.findIndex(t => t.type === 'strikethrough');
      if (strikeIdx !== -1) {
        removeTagFromStack(stack, tagCounts, 'strikethrough');
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'strikethrough', i, '~~', earliestPosition);
      }
      i += 2;
      continue;
    }
    
    // Single ~ also opens/closes strikethrough
    if (fullText[i] === '~') {
      const strikeTag = stack.find(t => t.type === 'strikethrough');
      const isLastChar = i === fullText.length - 1;
      
      // SPECIAL CASE: If strikethrough was opened with ~~ and this is the last character,
      // this ~ is likely the start of the closing ~~ (user still typing)
      if (strikeTag && strikeTag.marker === '~~' && isLastChar) {
        // Skip - treat as partial closer
        i++;
        continue;
      }
      
      if (strikeTag) {
        // Only close if markers match, or if single ~ closes single ~
        if (strikeTag.marker === '~') {
          removeTagFromStack(stack, tagCounts, 'strikethrough');
        }
        // If marker is ~~, don't close with single ~ (mismatched)
      } else {
        earliestPosition = addTagToStack(stack, tagCounts, 'strikethrough', i, '~', earliestPosition);
      }
      i++;
      continue;
    }
    
    // === Image: ![alt](url) ===
    // Track images separately from links. When we see ![ we enter image mode.
    if (fullText[i] === '!' && fullText[i + 1] === '[') {
      earliestPosition = addTagToStack(stack, tagCounts, 'image', i, '![', earliestPosition);
      i += 2; // Skip ![
      continue;
    }
    
    // === Link: [text](url) ===
    // Track link in two phases:
    //   1. Text phase: marker='[' - waiting for ]( 
    //   2. URL phase: marker='](' - waiting for )
    
    if (fullText[i] === '[' && fullText[i + 1] !== '{') {
      earliestPosition = addTagToStack(stack, tagCounts, 'link', i, '[', earliestPosition);
      i++;
      continue;
    }
    
    // Transition from text phase to URL phase on ](
    if (fullText[i] === ']' && fullText[i + 1] === '(') {
      // Check image first, then link
      const imgIdx = stack.findIndex(t => t.type === 'image' && t.marker === '![');
      if (imgIdx !== -1) {
        stack[imgIdx].marker = '](';
        i += 2;
        continue;
      }
      const linkIdx = stack.findIndex(t => t.type === 'link' && t.marker === '[');
      if (linkIdx !== -1) {
        // Transition to URL mode
        stack[linkIdx].marker = '](';
        i += 2; // Skip ](
        continue;
      }
    }
    
    // Close link/image on ) when in URL phase
    if (fullText[i] === ')') {
      const imgIdx = stack.findIndex(t => t.type === 'image' && t.marker === '](');
      if (imgIdx !== -1) {
        removeTagFromStack(stack, tagCounts, 'image');
        i++;
        continue;
      }
      const linkIdx = stack.findIndex(t => t.type === 'link' && t.marker === '](');
      if (linkIdx !== -1) {
        removeTagFromStack(stack, tagCounts, 'link');
        i++;
        continue;
      }
    }
    
    i++;
  }
  
  return {
    stack,
    tagCounts,
    previousTextLength: fullText.length,
    earliestPosition,
    inCodeBlock,
    inInlineCode,
    inMathBlock,
    inInlineMath,
  };
}

// ============================================================================
// Markdown Fixing
// ============================================================================

/**
 * Complete incomplete ordered list markers.
 * 
 * When streaming, we might have:
 *   "1. First item\n2" (incomplete - missing period)
 * 
 * This adds the period so remark parses it as a list marker:
 *   "1. First item\n2."
 * 
 * Only matches digits at the very END of the string after a newline,
 * so completed markers like "2." are not affected.
 */
function completeOrderedListMarkers(text: string): string {
  return text.replace(/\n(\d+)$/g, '\n$1.');
}

/**
 * Fix incomplete markdown by auto-closing open tags.
 * This allows formatting to appear immediately during streaming.
 * 
 * @param text - Raw markdown text
 * @param state - Current tag state
 * @returns Fixed markdown (ready for remark parsing)
 */
export function fixIncompleteMarkdown(
  text: string,
  state: IncompleteTagState
): string {
  if (!text || text.length === 0) {
    return text;
  }
  
  let fixed = text;
  const originalLength = text.length;
  
  // Extract trailing whitespace - closers must come BEFORE whitespace for markdown to parse
  // e.g., "**bold " → "**bold** " not "**bold **"
  const { content, whitespace } = extractTrailingWhitespace(fixed);
  fixed = content;
  
  // Auto-close open tags in reverse order (innermost first)
  const reversedStack = [...state.stack].reverse();
  
  // Track if we've already added closers (affects half-closer logic)
  let closersAdded = 0;
  
  for (const tag of reversedStack) {
    fixed = closeTag(fixed, tag, text, originalLength, closersAdded);
    closersAdded++;
  }
  
  // Complete incomplete ordered list markers (e.g., "1. First\n2" → "1. First\n2.")
  fixed = completeOrderedListMarkers(fixed);
  
  // Hide incomplete markers at the very end
  fixed = hideIncompleteMarkers(fixed);
  
  // Re-add trailing whitespace after closers
  return fixed + whitespace;
}

/**
 * Check if text has a bold+italic opener (***) that would indicate
 * a trailing * is closing italic, not being a partial bold closer.
 */
function hasBoldItalicOpener(text: string): boolean {
  // Check for *** at start or after whitespace (not part of ****)
  return /(^|[\s\n])\*\*\*[^*]/.test(text) || /^\*\*\*$/.test(text);
}

/**
 * Close a single tag by appending the appropriate closing marker
 * 
 * @param tag - The tag object (includes type, position, and marker)
 * @param closersAdded - Number of closers already added (0 = first tag being closed)
 *                       Used to determine if trailing * is a partial closer or a completed tag
 */
function closeTag(
  fixed: string, 
  tag: { type: string; position: number; marker: string }, 
  originalText: string, 
  originalLength: number,
  closersAdded: number
): string {
  // Only apply half-closer logic if this is the FIRST tag being closed.
  // If closersAdded > 0, the trailing character was likely closing a different tag.
  const isFirstClose = closersAdded === 0;
  
  switch (tag.type) {
    case 'bold':
      // SPECIAL CASE: If original text ends with single *, complete the ** closer
      // But only if:
      // 1. This is the first close
      // 2. There's no bold+italic opener (***) - if there is, trailing * closed italic
      if (isFirstClose && 
          endsWithPartialMarker(originalText, '*', '**') && 
          fixed.length === originalLength &&
          !hasBoldItalicOpener(originalText)) {
        return fixed + '*';
      }
      return fixed + '**';
      
    case 'italic':
      const hasContent = fixed.length > tag.position + 1;
      if (!hasContent) {
        // No content - use zero-width space to break ** pattern for clean hiding
        return fixed + '\u200B*';
      }
      return fixed + '*';
      
    case 'code':
      return fixed + '`';
      
    case 'strikethrough':
      // Close with the same marker that was used to open (~ or ~~)
      // remark-gfm requires matching delimiters
      // SPECIAL CASE: If original text ends with single ~ and opened with ~~, complete the closer
      if (tag.marker === '~~' && 
          isFirstClose && 
          endsWithPartialMarker(originalText, '~', '~~') && 
          fixed.length === originalLength) {
        return fixed + '~';  // Complete the ~~ closer
      }
      return fixed + tag.marker;
      
    case 'codeBlock':
      // Add closing fence
      return fixed.endsWith('\n') ? fixed + '```' : fixed + '\n```';
      
    case 'pendingCodeBlock':
    case 'pendingBacktick':
      // These are handled by hideIncompleteMarkers - don't add anything
      return fixed;
      
    case 'boldUnderscore':
      // SPECIAL CASE: If original text ends with single _, complete the __ closer
      if (isFirstClose && 
          endsWithPartialMarker(originalText, '_', '__') && 
          fixed.length === originalLength) {
        return fixed + '_';
      }
      return fixed + '__';
      
    case 'italicUnderscore': {
      const hasUnderContent = fixed.length > tag.position + 1;
      if (!hasUnderContent) {
        // No content - use zero-width space to break __ pattern
        return fixed + '\u200B_';
      }
      return fixed + '_';
    }
      
    case 'mathBlock':
      // Close math block with $$
      return fixed.endsWith('\n') ? fixed + '$$' : fixed + '\n$$';
      
    case 'inlineMath':
      return fixed + '$';
      
    case 'image':
      // Two phases: text phase (marker='![') and URL phase (marker='](')
      if (tag.marker === '](') {
        // In URL phase - just need closing )
        return fixed + ')';
      }
      // In text phase - strip incomplete images (can't show skeleton for images)
      // Remove everything from the ![ position onward
      return fixed.slice(0, tag.position);
      
    case 'link':
      // Two phases: text phase (marker='[') and URL phase (marker='](')
      if (tag.marker === '](') {
        // In URL phase - just need closing )
        return fixed + ')';
      }
      // In text phase - check if ] already typed
      if (fixed.endsWith(']')) {
        // Already have ], just need (#)
        return fixed + '(#)';
      }
      // Need full ](#) to create valid link
      return fixed + '](#)';
      
    default:
      return fixed;
  }
}

/**
 * Hide incomplete markers that have no content yet.
 * 
 * This is called AFTER auto-closing, so we hide auto-closed EMPTY tags.
 */
function hideIncompleteMarkers(text: string): string {
  let result = text;
  
  // === Hide empty inline formatting ===
  // Order matters: check longer patterns first!
  
  // Zero-width space (\u200B) is used to break up patterns when closing empty tags.
  // We need to hide these patterns too.
  
  // Empty bold+italic with zero-width space: "***\u200B***" at end
  result = result.replace(/(^|[\s\n])\*\*\*\u200B\*\*\*$/g, '$1');
  
  // Empty italic with zero-width space: "*\u200B*" at end
  result = result.replace(/(^|[\s\n])\*\u200B\*$/g, '$1');
  
  // Empty bold+italic: "******" at end preceded by whitespace/start (***...*** with no content)
  result = result.replace(/(^|[\s\n])\*\*\*\*\*\*$/g, '$1');
  
  // Empty bold: "****" at end preceded by whitespace/start
  result = result.replace(/(^|[\s\n])\*\*\*\*$/g, '$1');
  
  // Empty italic/bold: "**" at end - but ONLY if there's no opener before it
  // This handles empty italic (*...*) while not breaking multi-word bold.
  // Check: if "**" appears only once at the end preceded by whitespace/start, hide it.
  // If there's content with ** before (like "**bold **"), don't hide.
  const doubleAsteriskMatches = result.match(/\*\*/g);
  if (doubleAsteriskMatches && doubleAsteriskMatches.length === 1 && /(^|[\s\n])\*\*$/.test(result)) {
    result = result.replace(/(^|[\s\n])\*\*$/g, '$1');
  }
  
  // Empty strikethrough patterns (order matters: longer patterns first)
  // "~~~~" = double tilde open (~~) + double tilde close (~~)
  result = result.replace(/(^|[\s\n])~~~~$/g, '$1');
  
  // "~~" = single tilde open (~) + single tilde close (~)
  result = result.replace(/(^|[\s\n])~~$/g, '$1');
  
  // Single tilde at end (incomplete strikethrough)
  result = result.replace(/(^|[\s\n])~$/g, '$1');
  
  // === Hide pending backticks (building toward ``` or closing ```) ===
  
  // Pending backticks inside code block content (building toward closing fence)
  // Pattern: content ending with ` or `` before the auto-added \n```
  // "```js\ncode\n`\n```" → "```js\ncode\n```"
  // "```js\ncode\n``\n```" → "```js\ncode\n```"
  // 
  // We need to detect code blocks that end with pending backticks.
  // The code block may have content before it (like headings), so we can't
  // anchor to ^ - instead we look for the pattern anywhere in the string.
  // 
  // Key: If the string ends with \n`\n``` or \n``\n```, strip the pending backticks.
  // But only if there's a code block (contains ```\w*\n somewhere before).
  const hasCodeBlock = /```\w*\n/.test(result);
  if (hasCodeBlock) {
    // Strip pending backticks on their own line before closing fence
    // Check for `` first (longer match), then `
    result = result.replace(/\n``\n```$/g, '\n```');
    result = result.replace(/\n`\n```$/g, '\n```');
    
    // Also handle trailing backticks on same line as content
    // "code``\n```" → "code\n```"
    // But NOT just "``\n```" at the start (that would be empty)
    // We check that there's actual content before the backticks
    if (/[^\n`]``\n```$/.test(result)) {
      result = result.replace(/``\n```$/g, '\n```');
    } else if (/[^\n`]`\n```$/.test(result)) {
      result = result.replace(/`\n```$/g, '\n```');
    }
  }
  
  // === Hide empty inline code ===
  
  // Empty inline code: "``" (but not if part of code block fence)
  if (!result.includes('```')) {
    result = result.replace(/``$/g, '');
  }
  
  // === Hide incomplete backtick sequences (outside code blocks) ===
  
  // Single backtick at end with no content
  result = result.replace(/(^|[\s\n])`$/g, '$1');
  
  // Two backticks at end (pending code block opening)
  result = result.replace(/(^|[\s\n])``$/g, '$1');
  
  // === Hide incomplete components ===
  
  // Hide any incomplete component syntax at end:
  // - [{           (just started)
  // - [{c          (typing key)
  // - [{c:         (after colon)
  // - [{c:"...     (typing name)
  // - [{c:"Name",p:{...  (typing props)
  const componentMatch = result.match(/(\[\{[^}\]]*?)$/);
  if (componentMatch) {
    result = result.slice(0, -componentMatch[1].length);
  }
  
  // === Hide empty underscore formatting ===
  
  // Empty bold underscore with zero-width space: "__\u200B__" at end
  result = result.replace(/(^|[\s\n])__\u200B__$/g, '$1');
  
  // Empty italic underscore with zero-width space: "_\u200B_" at end
  result = result.replace(/(^|[\s\n])_\u200B_$/g, '$1');
  
  // Empty bold underscore: "____" at end preceded by whitespace/start
  result = result.replace(/(^|[\s\n])____$/g, '$1');
  
  // Empty italic underscore: "__" at end (only if single occurrence)
  // This mirrors the ** logic for italic/bold ambiguity
  const doubleUnderscoreMatches = result.match(/__/g);
  if (doubleUnderscoreMatches && doubleUnderscoreMatches.length === 1 && /(^|[\s\n])__$/.test(result)) {
    result = result.replace(/(^|[\s\n])__$/g, '$1');
  }
  
  // Single underscore at end (incomplete italic)
  result = result.replace(/(^|[\s\n])_$/g, '$1');
  
  // === Hide incomplete math ===
  
  // Single $ at end (incomplete inline math) — but NOT $$ 
  // Use negative lookbehind to avoid matching $$ as two single $
  if (result.endsWith('$') && !result.endsWith('$$')) {
    result = result.replace(/(^|[\s\n])\$$/g, '$1');
  }
  
  // Empty inline math: "$$" (two single $) at end, only if no other $ in text
  // This distinguishes empty inline math ($...$) from math block ($$...$$)
  // We skip this — empty inline code gets "$" hidden above
  
  // Empty math block "$$$$" at end (open $$ + close $$ with no content)
  result = result.replace(/(^|[\s\n])\$\$\$\$$/g, '$1');
  
  // Empty math block "$$\n$$" at end (open $$ + newline + close $$ with no content)
  result = result.replace(/(^|[\s\n])\$\$\n\$\$$/g, '$1');
  
  // Lone $$ at end (incomplete math block opening, no content after it)
  // Only hide if $$ appears exactly once (it's the opening, not a closing)
  const dollarPairCount = (result.match(/\$\$/g) || []).length;
  if (dollarPairCount === 1) {
    result = result.replace(/(^|[\s\n])\$\$$/g, '$1');
  }
  
  // === Hide incomplete images ===
  
  // "![" at end - incomplete image opening
  result = result.replace(/(^|[\s\n])!\[$/g, '$1');
  
  // "!" at end followed by nothing (might be start of ![)
  // Don't hide standalone ! - it's valid text
  
  // === Hide incomplete links ===
  
  // Empty link with no text: "[](#)" - hide completely
  result = result.replace(/(^|[\s\n])\[\]\(#\)$/g, '$1');
  
  // Single opening bracket with no content: "[" at end - hide it
  result = result.replace(/(^|[\s\n])\[$/g, '$1');
  
  // DON'T hide [text](#) - that's a valid link with placeholder URL!
  // Remark will parse it as a clickable link.
  
  return result;
}

// ============================================================================
// Exports for Testing
// ============================================================================

/**
 * Test-only exports
 */
export const __test__ = {
  hideIncompleteMarkers,
  rebuildTagState,
  isWordChar,
  isHorizontalRuleLine,
  isAsteriskListMarker,
};
