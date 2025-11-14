/**
 * Incomplete Markdown Parser
 * 
 * Handles incomplete markdown gracefully during streaming.
 * Inspired by Streamdown's approach but adapted for React Native.
 */

import { IncompleteTagState } from './types';



/**
 * Fix incomplete markdown by completing partial syntax
 * Now optimized to only process from earliest incomplete tag position
 */
export function fixIncompleteMarkdown(
  text: string,
  state?: IncompleteTagState
): string {
  if (!text || text.length === 0) {
    return text;
  }

  // Always hide incomplete markers (even when stack is empty)
  text = hideIncompleteCodeBlockMarkers(text);
  
  const { cleanText } = hideIncompleteComponents(text);
  text = cleanText;

  // If we have state and no incomplete tags, skip completion processing
  if (state && state.stack.length === 0) {
    console.log('✅ No incomplete tags - skipping completion processing');
    return text;
  }

  // If we have state, we can skip processing text before earliestPosition
  const startPos = state ? state.earliestPosition : 0;
  
  // Only process the portion that needs fixing
  if (startPos > 0 && startPos < text.length) {
    const unchangedPart = text.substring(0, startPos);
    const needsFixing = text.substring(startPos);
    
    console.log('🔄 Performance: Only processing from position', startPos, 
                'out of', text.length, 'characters');
    
    return unchangedPart + processMarkdown(needsFixing, true);
  }

  return processMarkdown(text, true);
}

/**
 * Process markdown text (original fixIncompleteMarkdown logic)
 * @param skipHiding - if true, skip hiding logic (already done in parent)
 */
function processMarkdown(text: string, skipHiding = false): string {
  if (!text || text.length === 0) {
    return text;
  }

  let processedText = text;

  if (!skipHiding) {
    // Hide incomplete code block markers FIRST
    processedText = hideIncompleteCodeBlockMarkers(processedText);

    // Hide incomplete component syntax
    const { cleanText, bufferedComponent } = hideIncompleteComponents(processedText);
    processedText = cleanText;
    
    // Log if we're buffering anything
    if (bufferedComponent) {
      console.log('🚫 Hiding incomplete component from display');
    }
  }

  // Fix incomplete bold text - but only if it's truly incomplete
  // Check if the text has unmatched ** at the beginning
  processedText = fixIncompleteBold(processedText);

  // Fix incomplete italic text (must check after bold to avoid conflicts)
  processedText = fixIncompleteItalic(processedText);

  // Fix incomplete inline code
  processedText = fixIncompleteCode(processedText);

  // Fix incomplete code blocks
  processedText = fixIncompleteCodeBlock(processedText);

  // Fix incomplete links
  processedText = fixIncompleteLink(processedText);

  // Handle incomplete lists - ensure proper line breaks
  processedText = fixIncompleteList(processedText);

  // Handle incomplete headings - ensure proper line breaks
  processedText = fixIncompleteHeadings(processedText);

  return processedText;
}

/**
 * Hide incomplete code block markers (`, ``, or ``` at the end without content)
 */
function hideIncompleteCodeBlockMarkers(text: string): string {
  // Check if text ends with 1, 2, or 3 backticks
  const match = text.match(/(```?)$/);
  
  if (match) {
    const backticks = match[1];
    
    // Only hide if it's JUST the backticks (no language identifier yet)
    // This allows ```j to show the code block starting to form
    if (backticks.length <= 3) {
      const beforeBackticks = text.substring(0, text.length - backticks.length);
      console.log(`🚫 Hiding incomplete code block markers: "${backticks}"`);
      return beforeBackticks;
    }
  }
  
  return text;
}

/**
 * Hide incomplete component syntax to prevent showing partial code
 * Returns the text with incomplete components removed and the buffered component text
 */
function hideIncompleteComponents(text: string): { cleanText: string; bufferedComponent: string } {
  // Find the last occurrence of {{ (any component start, not just {{component:)
  const lastComponentStart = text.lastIndexOf('{{');
  
  // Check if the last {{ is complete
  let lastComponentIsComplete = false;
  
  if (lastComponentStart !== -1) {
    const textAfterComponentStart = text.substring(lastComponentStart);
    
    // Quick check: does it have closing }}?
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < textAfterComponentStart.length; i++) {
      const char = textAfterComponentStart[i];
      const nextChar = textAfterComponentStart[i + 1];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        
        if (braceCount === 1 && nextChar === '}') {
          lastComponentIsComplete = true;
          break;
        }
      }
    }
  }
  
  // Hide single trailing { if no unclosed component
  if (text.endsWith('{') && !text.endsWith('{{') && (lastComponentStart === -1 || lastComponentIsComplete)) {
    console.log('🚫 Hiding single trailing {');
    return { cleanText: text.slice(0, -1), bufferedComponent: '{' };
  }
  
  if (lastComponentStart === -1) {
    // No component syntax found
    return { cleanText: text, bufferedComponent: '' };
  }
  
  // Re-check completion (we already did this above, but keep for clarity)
  const textAfterComponentStart = text.substring(lastComponentStart);
  
  // Count braces to find matching closing }}
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let foundClosing = false;
  
  for (let i = 0; i < textAfterComponentStart.length; i++) {
    const char = textAfterComponentStart[i];
    const nextChar = textAfterComponentStart[i + 1];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      
      // Check if this is the closing }} (two consecutive })
      // When braceCount hits 1, we're at the first } of the final }}
      if (braceCount === 1 && nextChar === '}') {
        foundClosing = true;
        break;
      }
    }
  }
  
  if (foundClosing) {
    // Component is complete, don't hide anything
    console.log('✅ Complete component found, not hiding');
    return { cleanText: text, bufferedComponent: '' };
  }
  
  // Component is incomplete, hide everything from {{ onwards
  const cleanText = text.substring(0, lastComponentStart);
  const bufferedComponent = text.substring(lastComponentStart);
  
  console.log('🔒 Buffering incomplete component:', {
    cleanText: cleanText.substring(Math.max(0, cleanText.length - 50)),
    bufferLength: bufferedComponent.length,
    bufferPreview: bufferedComponent.substring(0, 100)
  });
  
  return { cleanText, bufferedComponent };
}

/**
 * Fix incomplete bold text by checking for truly unmatched ** pairs
 * Handles streaming cases where ** appears at the end or has content without closing
 */
function fixIncompleteBold(text: string): string {
  // Find all ** occurrences
  const boldMarkers = [];
  let index = 0;
  while ((index = text.indexOf('**', index)) !== -1) {
    boldMarkers.push(index);
    index += 2;
  }
  
  // If we have an odd number of **, the last one is unclosed
  if (boldMarkers.length % 2 === 1) {
    // Get the position of the last unclosed **
    const lastMarkerPos = boldMarkers[boldMarkers.length - 1];
    const textAfterLastMarker = text.substring(lastMarkerPos + 2);
    
    // Check if text ends with ** (no content after)
    if (text.endsWith('**') && textAfterLastMarker.length === 0) {
      // Complete with zero-width space: **\u200B** (empty bold = invisible)
      return text + '\u200B**';
    }
    
    // If there's content after the last **, complete it
    if (textAfterLastMarker.trim().length > 0) {
      // Check if text ends with a single * (likely the first * of closing **)
      // Remove it before adding the closing **
      let contentToClose = textAfterLastMarker;
      if (text.endsWith('*') && !text.endsWith('**') && !text.endsWith('***')) {
        // Remove the trailing single *
        contentToClose = textAfterLastMarker.slice(0, -1);
      }
      
      // Insert closing ** before any trailing whitespace
      const trimmed = contentToClose.trimEnd();
      const trailingWhitespace = contentToClose.substring(trimmed.length);
      const beforeWhitespace = text.substring(0, lastMarkerPos + 2 + trimmed.length);
      
      return beforeWhitespace + '**' + trailingWhitespace;
    }
  }
  
  return text;
}

/**
 * Fix incomplete italic text by checking for unmatched * pairs
 * Must be called after fixIncompleteBold to avoid conflicts
 * Handles streaming cases where * appears at the end or has content without closing
 */
function fixIncompleteItalic(text: string): string {
  // First, check if text ends with a single * (not part of **)
  if (text.endsWith('*') && !text.endsWith('**')) {
    // Count all single * that aren't part of **
    const singleStars: number[] = [];
    let index = 0;
    while (index < text.length) {
      if (text[index] === '*') {
        // Check if this is part of **
        if (index < text.length - 1 && text[index + 1] === '*') {
          index += 2; // Skip both stars
          continue;
        }
        singleStars.push(index);
      }
      index++;
    }
    
    // If we have an odd number of single *, the last one is unclosed
    if (singleStars.length % 2 === 1) {
      const lastStarPos = singleStars[singleStars.length - 1];
      const textAfterLastStar = text.substring(lastStarPos + 1);
      
      // If text ends with * and no content after, complete with zero-width space
      if (textAfterLastStar.length === 0) {
        return text + '\u200B*';
      }
      
      // If there's content after the last *, complete it normally
      if (textAfterLastStar.trim().length > 0) {
        return text + '*';
      }
    }
  }
  
  // Handle incomplete italic with content: *text without closing *
  // Use regex that doesn't match **
  return text.replace(
    /(?<!\*)\*([^*]+)$/,
    (match, content) => {
      // Double-check this isn't part of ** by checking the match position
      const matchIndex = text.lastIndexOf(match);
      if (matchIndex > 0 && text[matchIndex - 1] === '*') {
        return match; // It's part of **, don't change
      }
      
      // Check if there's already a closing * in the content
      if (content.includes('*')) {
        return match; // Already closed, don't add another
      }
      
      // Insert closing * before trailing whitespace
      const trimmed = content.trimEnd();
      const trailingWhitespace = content.substring(trimmed.length);
      return '*' + trimmed + '*' + trailingWhitespace;
    }
  );
}

/**
 * Fix incomplete inline code by checking for unmatched ` pairs
 * Handles streaming cases where ` appears at the end or has content without closing
 */
function fixIncompleteCode(text: string): string {
  // Check if text ends with a single ` (not part of ```)
  if (text.endsWith('`') && !text.endsWith('```')) {
    // Count all single ` that aren't part of ```
    const singleBackticks: number[] = [];
    let index = 0;
    while (index < text.length) {
      if (text[index] === '`') {
        // Check if this is part of ```
        if (index < text.length - 2 && text[index + 1] === '`' && text[index + 2] === '`') {
          index += 3; // Skip all three backticks
          continue;
        }
        singleBackticks.push(index);
      }
      index++;
    }
    
    // If we have an odd number of single `, the last one is unclosed
    if (singleBackticks.length % 2 === 1) {
      const lastBacktickPos = singleBackticks[singleBackticks.length - 1];
      const textAfterLastBacktick = text.substring(lastBacktickPos + 1);
      
      // If text ends with ` and no content after, complete with zero-width space
      if (textAfterLastBacktick.length === 0) {
        return text + '\u200B`';
      }
      
      // If there's content after the last `, complete it normally
      if (textAfterLastBacktick.trim().length > 0) {
        return text + '`';
      }
    }
  }
  
  // Handle incomplete code with content: `code without closing `
  // Use regex that doesn't match ```
  return text.replace(
    /(?<!`)`([^`]+)$/,
    (match, content) => {
      // Double-check this isn't part of ``` by checking the match position
      const matchIndex = text.lastIndexOf(match);
      if (matchIndex > 0 && text[matchIndex - 1] === '`') {
        return match; // Part of ```, don't change
      }
      
      // Check if there's already a closing ` in the content
      if (content.includes('`')) {
        return match; // Already closed, don't add another
      }
      
      // Insert closing ` before trailing whitespace
      const trimmed = content.trimEnd();
      const trailingWhitespace = content.substring(trimmed.length);
      return '`' + trimmed + '`' + trailingWhitespace;
    }
  );
}

/**
 * Fix incomplete code blocks by checking for unmatched ``` pairs
 * Handles streaming cases where ``` appears at the end or has content without closing
 */
function fixIncompleteCodeBlock(text: string): string {
  // Find all ``` occurrences
  const codeBlockMarkers: number[] = [];
  let index = 0;
  while ((index = text.indexOf('```', index)) !== -1) {
    codeBlockMarkers.push(index);
    index += 3;
  }
  
  // If we have an odd number of ```, the last one is unclosed
  if (codeBlockMarkers.length % 2 === 1) {
    const lastMarkerPos = codeBlockMarkers[codeBlockMarkers.length - 1];
    const textAfterLastMarker = text.substring(lastMarkerPos + 3);
    
    // Check if text ends with ``` (no content after)
    if (text.endsWith('```') && textAfterLastMarker.length === 0) {
      // Complete with zero-width space: ```\u200B``` (empty code block = invisible)
      return text + '\u200B```';
    }
    
    // If there's content after the last ```, complete it
    if (textAfterLastMarker.trim().length > 0) {
      const hasNewline = textAfterLastMarker.includes('\n');
      
      if (!hasNewline) {
        // Has language but no newline yet - add newline to show code block
        return text + '\n```';
      }
      
      // Has newline and content - complete normally
      return text + '\n```';
    }
  }
  
  return text;
}

/**
 * Fix incomplete links by checking for unmatched [text](url patterns
 * Handles streaming cases where link syntax is incomplete
 */
function fixIncompleteLink(text: string): string {
  // Find the last opening [ in the text
  let lastOpenBracket = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '[' && (i === 0 || text[i - 1] !== '\\')) {
      lastOpenBracket = i;
      break;
    }
  }
  
  if (lastOpenBracket === -1) {
    return text; // No unclosed bracket found
  }
  
  const afterBracket = text.substring(lastOpenBracket);
  
  // Check if we have [text] with ( after
  const withParenMatch = afterBracket.match(/^\[([^\]]*)\]\(/);
  if (withParenMatch) {
    // Has [text]( - check for closing )
    const afterParen = text.substring(lastOpenBracket + withParenMatch[0].length);
    if (!afterParen.includes(')')) {
      // No closing ) - add it
      return text + ')';
    }
    return text;
  }
  
  // Check if we have [text] without (
  const withClosingBracketMatch = afterBracket.match(/^\[([^\]]*)\]([^(]*)$/);
  if (withClosingBracketMatch) {
    // Has [text] but no ( - complete to [text]()
    return text + '()';
  }
  
  // Check if we have [text without closing ]
  const withoutClosingBracketMatch = afterBracket.match(/^\[([^\]]*)$/);
  if (withoutClosingBracketMatch) {
    // Has [text - complete to [text]()
    return text + ']()';
  }
  
  return text;
}

/**
 * Fix incomplete list formatting
 */
function fixIncompleteList(text: string): string {
  const lines = text.split('\n');
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // Check if this is a list item
    const listMatch = line.match(/^(\s*)([-*+])(\s+)(.+)$/);
    
    if (listMatch) {
      processedLines.push(line);
      
      // If next line exists and is not a list item or empty, add spacing
      if (nextLine !== undefined && 
          !nextLine.match(/^(\s*)([-*+])(\s+)/) && 
          nextLine.trim() !== '') {
        // Add an empty line after the list if the next line is not part of the list
        if (i === lines.length - 1 || !nextLine.match(/^(\s*)([-*+])(\s+)/)) {
          processedLines.push('');
        }
      }
    } else {
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
}

/**
 * Fix incomplete heading formatting
 */
function fixIncompleteHeadings(text: string): string {
  const lines = text.split('\n');
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // Check if this is a heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      processedLines.push(line);
      
      // Ensure proper spacing after headings
      if (nextLine !== undefined && nextLine.trim() !== '') {
        processedLines.push('');
      }
    } else {
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
}

/**
 * Check if markdown appears to be incomplete (still streaming)
 */
export function isMarkdownIncomplete(text: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }

  // Check for incomplete bold (odd number of ** markers)
  const boldMarkers = (text.match(/\*\*/g) || []).length;
  if (boldMarkers % 2 === 1) {
    return true;
  }

  // Check for incomplete italic (odd number of single * not part of **)
  let singleStars = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '*') {
      // Check if this is part of **
      if (i < text.length - 1 && text[i + 1] === '*') {
        i++; // Skip the next * too
        continue;
      }
      singleStars++;
    }
  }
  if (singleStars % 2 === 1) {
    return true;
  }

  // Check for incomplete inline code (odd number of single ` not part of ```)
  let singleBackticks = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '`') {
      // Check if this is part of ```
      if (i < text.length - 2 && text[i + 1] === '`' && text[i + 2] === '`') {
        i += 2; // Skip the next two backticks too
        continue;
      }
      singleBackticks++;
    }
  }
  if (singleBackticks % 2 === 1) {
    return true;
  }

  // Check for incomplete code blocks (odd number of ``` markers)
  const codeBlockMarkers = (text.match(/```/g) || []).length;
  if (codeBlockMarkers % 2 === 1) {
    return true;
  }

  // Check for incomplete links [text](url without closing )
  const linkPattern = /\[([^\]]+)\]\(([^)]+)$/;
  if (linkPattern.test(text)) {
    return true;
  }

  // Check for incomplete components using the same logic as hideIncompleteComponents
  const lastComponentStart = text.lastIndexOf('{{component:');
  if (lastComponentStart !== -1) {
    const textAfterComponentStart = text.substring(lastComponentStart);
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let foundClosing = false;
    
    for (let i = 0; i < textAfterComponentStart.length; i++) {
      const char = textAfterComponentStart[i];
      const nextChar = textAfterComponentStart[i + 1];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 1 && nextChar === '}') {
          foundClosing = true;
          break;
        }
      }
    }
    
    if (!foundClosing) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitize markdown for safe rendering
 */
export function sanitizeMarkdown(text: string): string {
  // Remove potentially dangerous HTML tags while preserving markdown
  const dangerousTags = /<(script|iframe|object|embed|form|input)[^>]*>.*?<\/\1>/gi;
  return text.replace(dangerousTags, '');
}

/**
 * Update incomplete tag state incrementally based on new characters
 * @param state Current state
 * @param newText New complete text
 * @returns Updated state
 */
export function updateIncompleteTagState(
  state: IncompleteTagState,
  newText: string
): IncompleteTagState {
  // Extract new characters that were added
  const newChars = newText.slice(state.previousTextLength);
  
  if (newChars.length === 0) {
    // No new characters, return state unchanged
    return state;
  }
  
  // Start with current state
  let stack = [...state.stack];
  let tagCounts = { ...state.tagCounts };
  let inCodeBlock = state.inCodeBlock;
  let inInlineCode = state.inInlineCode;
  
  // Process each new character
  for (let i = 0; i < newChars.length; i++) {
    const position = state.previousTextLength + i;
    const char = newChars[i];
    const prevChar = i > 0 ? newChars[i - 1] : (state.previousTextLength > 0 ? newText[position - 1] : '');
    const nextChar = newChars[i + 1];
    const nextChar2 = newChars[i + 2];
    
    // Check for opening markers
    
    // Code blocks: ``` (check for 3 backticks)
    if (char === '`' && nextChar === '`' && nextChar2 === '`') {
      // Check if this closes an existing code block (LIFO - find last occurrence)
      const codeBlockIndex = stack.map((tag, idx) => tag.type === 'codeBlock' ? idx : -1)
        .filter(idx => idx !== -1)
        .pop();
      if (codeBlockIndex !== undefined && codeBlockIndex !== -1) {
        // Close the most recent code block
        stack.splice(codeBlockIndex, 1);
        tagCounts.codeBlock--;
        inCodeBlock = false; // Exit code block context
      } else {
        // Open new code block
        stack.push({
          type: 'codeBlock',
          position,
          marker: '```',
          openingText: newText.slice(Math.max(0, position - 10), position + 13),
        });
        tagCounts.codeBlock++;
        inCodeBlock = true; // Enter code block context
      }
      i += 2; // Skip next 2 characters
      continue;
    }
    
    // Bold: ** (check for 2 asterisks)
    if (char === '*') {
      // Check if this is part of a ** pair
      const isBoldOpening = nextChar === '*' && prevChar !== '*';
      const isBoldClosing = prevChar === '*' && nextChar !== '*';
      
      if (isBoldOpening || isBoldClosing) {
        // If we're the second * of an opening **, we might have an italic from the first *
        // Remove it if present
        if (isBoldClosing) {
          const italicAtPrevPos = stack.findIndex(tag => tag.type === 'italic' && tag.position === position - 1);
          if (italicAtPrevPos !== -1) {
            stack.splice(italicAtPrevPos, 1);
            tagCounts.italic--;
          }
        }
        
        // Check if this closes an existing bold (LIFO - find last occurrence)
        const boldIndex = stack.map((tag, idx) => tag.type === 'bold' ? idx : -1)
          .filter(idx => idx !== -1)
          .pop();
        if (boldIndex !== undefined && boldIndex !== -1) {
          // Close the most recent bold
          stack.splice(boldIndex, 1);
          tagCounts.bold--;
        } else if (isBoldOpening) {
          // Open new bold
          stack.push({
            type: 'bold',
            position,
            marker: '**',
            openingText: newText.slice(Math.max(0, position - 10), position + 12),
          });
          tagCounts.bold++;
        } else if (isBoldClosing) {
          // We're closing a bold that doesn't exist, but we should open one
          // This happens when streaming "**" as two separate calls
          stack.push({
            type: 'bold',
            position: position - 1,
            marker: '**',
            openingText: newText.slice(Math.max(0, position - 11), position + 11),
          });
          tagCounts.bold++;
        }
        
        if (isBoldOpening) {
          i += 1; // Skip next character
        }
        continue;
      }
    }
    
    // Inline code: ` (single backtick, but skip if it's part of ```)
    if (char === '`') {
      // Skip if this is part of a ``` sequence
      const isPartOfCodeBlock = (nextChar === '`' && nextChar2 === '`') || 
                                (prevChar === '`' && nextChar === '`') ||
                                (prevChar === '`' && (i >= 2 ? newChars[i - 2] : newText[position - 2]) === '`');
      
      if (!isPartOfCodeBlock) {
        // Check if this closes an existing code (LIFO - find last occurrence)
        const codeIndex = stack.map((tag, idx) => tag.type === 'code' ? idx : -1)
          .filter(idx => idx !== -1)
          .pop();
        if (codeIndex !== undefined && codeIndex !== -1) {
          // Close the most recent code
          stack.splice(codeIndex, 1);
          tagCounts.code--;
          inInlineCode = false; // Exit inline code context
        } else {
          // Open new code
          stack.push({
            type: 'code',
            position,
            marker: '`',
            openingText: newText.slice(Math.max(0, position - 10), position + 11),
          });
          tagCounts.code++;
          inInlineCode = true; // Enter inline code context
        }
        continue;
      }
    }
    
    // Italic: * (single asterisk, not part of **)
    if (char === '*' && prevChar !== '*' && nextChar !== '*') {
      // Check if there's an unclosed bold tag AND prev char is not whitespace
      // This means it's likely the first * of a closing **
      const hasBoldTag = stack.some(tag => tag.type === 'bold');
      const prevIsWhitespace = prevChar === ' ' || prevChar === '\n' || prevChar === '\t' || prevChar === '';
      
      if (hasBoldTag && !prevIsWhitespace) {
        // Don't add - this is likely the first * of a closing **
        // Skip processing this character
        continue;
      }
      
      // Check if this closes an existing italic (LIFO - find last occurrence)
      const italicIndex = stack.map((tag, idx) => tag.type === 'italic' ? idx : -1)
        .filter(idx => idx !== -1)
        .pop();
      if (italicIndex !== undefined && italicIndex !== -1) {
        // Close the most recent italic
        stack.splice(italicIndex, 1);
        tagCounts.italic--;
      } else {
        // Open new italic
        stack.push({
          type: 'italic',
          position,
          marker: '*',
          openingText: newText.slice(Math.max(0, position - 10), position + 11),
        });
        tagCounts.italic++;
      }
      continue;
    }
    
    // Links: [ (but only if NOT in code context)
    if (char === '[' && !inCodeBlock && !inInlineCode) {
      // Open new link
      stack.push({
        type: 'link',
        position,
        marker: '[',
        openingText: newText.slice(Math.max(0, position - 10), position + 11),
      });
      tagCounts.link++;
      continue;
    }
    
    // Links: closing ) after ]
    if (char === ')') {
      // Find most recent link
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].type === 'link') {
          // Check if there's a ] before this )
          const textBetween = newText.slice(stack[j].position, position + 1);
          if (textBetween.includes('](')) {
            // Complete link found
            stack.splice(j, 1);
            tagCounts.link--;
            break;
          }
        }
      }
      continue;
    }
    
    // Components: {{ (but only if NOT in code context)
    if (char === '{' && nextChar === '{' && !inCodeBlock && !inInlineCode) {
      // Track ANY {{ as potential component when not in code
      stack.push({
        type: 'component',
        position,
        marker: '{{',
        openingText: newText.slice(Math.max(0, position - 10), position + 22),
      });
      tagCounts.component++;
      i += 1; // Skip next character
      continue;
    }
    
    // Components: closing }}
    if (char === '}' && nextChar === '}') {
      // Find most recent component (LIFO - find last occurrence)
      const componentIndex = stack.map((tag, idx) => tag.type === 'component' ? idx : -1)
        .filter(idx => idx !== -1)
        .pop();
      if (componentIndex !== undefined && componentIndex !== -1) {
        // Close the most recent component
        stack.splice(componentIndex, 1);
        tagCounts.component--;
        i += 1; // Skip next character
        continue;
      }
    }
  }
  
  // Calculate earliest position (bottom of stack)
  const earliestPosition = stack.length > 0 ? stack[0].position : newText.length;
  
  return {
    stack,
    earliestPosition,
    previousTextLength: newText.length,
    tagCounts,
    inCodeBlock,
    inInlineCode,
  };
}

/**
 * Optimize markdown for performance during rapid updates
 */
export function optimizeForStreaming(
  text: string,
  state?: IncompleteTagState
): string {
  // For very long texts, we might want to limit processing to recent changes
  const MAX_PROCESSING_LENGTH = 10000;
  
  if (text.length > MAX_PROCESSING_LENGTH) {
    // Process only the last portion that's likely to contain incomplete markdown
    const recentText = text.slice(-MAX_PROCESSING_LENGTH);
    const beforeText = text.slice(0, -MAX_PROCESSING_LENGTH);
    
    return beforeText + fixIncompleteMarkdown(recentText, state);
  }
  
  return fixIncompleteMarkdown(text, state);
}
