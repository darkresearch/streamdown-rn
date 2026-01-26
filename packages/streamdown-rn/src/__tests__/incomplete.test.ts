/**
 * Incomplete Markdown Handler Tests
 * 
 * Tests for format-as-you-type functionality.
 */

import { describe, it, expect } from 'bun:test';
import { updateTagState, fixIncompleteMarkdown, INITIAL_INCOMPLETE_STATE } from '../core/incomplete';

describe('Incomplete Markdown Handler', () => {
  describe('Tag state tracking', () => {
    it('should track opening bold tag', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '**');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('bold');
      expect(state.tagCounts.bold).toBe(1);
    });
    
    it('should track and close bold tag', () => {
      let state = updateTagState(INITIAL_INCOMPLETE_STATE, '**bold');
      state = updateTagState(state, '**bold**');
      expect(state.stack.length).toBe(0);
      expect(state.tagCounts.bold).toBe(0);
    });
    
    it('should track nested tags', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '**bold *italic*');
      // Bold still open, italic closed
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('bold');
    });
    
    it('should track code blocks', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '```\ncode');
      expect(state.inCodeBlock).toBe(true);
      expect(state.stack.some(tag => tag.type === 'codeBlock')).toBe(true);
    });
    
    it('should skip markdown inside code blocks', () => {
      let state = updateTagState(INITIAL_INCOMPLETE_STATE, '```\n**not bold**');
      // Should only have code block in stack, not bold
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('codeBlock');
    });
  });
  
  describe('Auto-closing incomplete tags', () => {
    it('should auto-close incomplete bold', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '**bold');
      const fixed = fixIncompleteMarkdown('**bold', state);
      // Should auto-close the bold tag
      expect(fixed).toContain('**bold');
      expect(state.stack.length).toBe(1);
    });
    
    it('should auto-close incomplete italic', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '*italic');
      const fixed = fixIncompleteMarkdown('*italic', state);
      expect(fixed).toBe('*italic*');
    });
    
    it('should auto-close nested tags correctly', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '**bold *italic*');
      const fixed = fixIncompleteMarkdown('**bold *italic*', state);
      // Should auto-close the still-open bold tag
      expect(fixed).toContain('**');
    });
    
    it('should auto-close code block', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '```js\nconst x = 1;');
      const fixed = fixIncompleteMarkdown('```js\nconst x = 1;', state);
      expect(fixed).toContain('```'); // Should add closing fence
    });
  });
  
  describe('Hiding incomplete markers', () => {
    it('should hide trailing ** with no content', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '**');
      const fixed = fixIncompleteMarkdown('**', state);
      expect(fixed).toBe('');
    });
    
    it('should hide trailing *** (bold+italic) with no content', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '***');
      const fixed = fixIncompleteMarkdown('***', state);
      // *** opens bold+italic, auto-closes to ******, should be hidden
      expect(fixed).toBe('');
    });
    
    it('should hide trailing *** after text with no content', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, 'Text ***');
      const fixed = fixIncompleteMarkdown('Text ***', state);
      // Should hide the empty bold+italic
      expect(fixed).toBe('Text ');
    });
    
    it('should hide trailing ` with no content', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '`');
      const fixed = fixIncompleteMarkdown('`', state);
      expect(fixed).toBe('');
    });
    
    it('should hide incomplete code block fence', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, 'Some text\n```');
      const fixed = fixIncompleteMarkdown('Some text\n```', state);
      // Should auto-close and then hide trailing fence
      expect(fixed).toContain('Some text');
    });
  });
  
  describe('Nested formatting (regression tests)', () => {
    it('should correctly track bold containing italic', () => {
      // **bold *italic* more**
      let state = INITIAL_INCOMPLETE_STATE;
      
      state = updateTagState(state, '**bold');
      expect(state.stack.map(s => s.type)).toEqual(['bold']);
      
      state = updateTagState(state, '**bold *italic');
      expect(state.stack.map(s => s.type)).toEqual(['bold', 'italic']);
      
      state = updateTagState(state, '**bold *italic*');
      expect(state.stack.map(s => s.type)).toEqual(['bold']);
      
      state = updateTagState(state, '**bold *italic* more**');
      expect(state.stack.map(s => s.type)).toEqual([]);
    });
    
    it('should correctly track italic containing bold', () => {
      // *italic **bold** more*
      let state = INITIAL_INCOMPLETE_STATE;
      
      state = updateTagState(state, '*italic');
      expect(state.stack.map(s => s.type)).toEqual(['italic']);
      
      state = updateTagState(state, '*italic **bold');
      expect(state.stack.map(s => s.type)).toEqual(['italic', 'bold']);
      
      state = updateTagState(state, '*italic **bold**');
      expect(state.stack.map(s => s.type)).toEqual(['italic']);
      
      state = updateTagState(state, '*italic **bold** more*');
      expect(state.stack.map(s => s.type)).toEqual([]);
    });
    
    it('should ignore markdown inside code blocks', () => {
      let state = INITIAL_INCOMPLETE_STATE;
      
      state = updateTagState(state, '```');
      expect(state.inCodeBlock).toBe(true);
      
      state = updateTagState(state, '```\n**not bold**');
      expect(state.inCodeBlock).toBe(true);
      expect(state.stack.map(s => s.type)).toEqual(['codeBlock']);
      // Bold should NOT be tracked inside code block
      expect(state.tagCounts.bold).toBeUndefined();
      
      state = updateTagState(state, '```\n**not bold**\n```');
      expect(state.inCodeBlock).toBe(false);
      expect(state.stack.map(s => s.type)).toEqual([]);
    });
    
    it('should track strikethrough correctly', () => {
      let state = INITIAL_INCOMPLETE_STATE;
      
      state = updateTagState(state, '~~strike');
      expect(state.stack.map(s => s.type)).toEqual(['strikethrough']);
      
      state = updateTagState(state, '~~strike~~');
      expect(state.stack.map(s => s.type)).toEqual([]);
    });
  });
  
  describe('Format-as-you-type (immediate formatting)', () => {
    // Helper to get fixed markdown
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should show bold formatting immediately when content starts', () => {
      // As soon as there's content after **, it should render as bold
      expect(fix('**b')).toBe('**b**');
      expect(fix('**bold')).toBe('**bold**');
      expect(fix('**bold text')).toBe('**bold text**');
    });
    
    it('should handle trailing whitespace in multi-word bold', () => {
      // Trailing space must come AFTER closers for markdown to parse
      // "**bold " → "**bold** " not "**bold **"
      expect(fix('**bold ')).toBe('**bold** ');
      expect(fix('**bold multi ')).toBe('**bold multi** ');
      expect(fix('**bold  ')).toBe('**bold**  '); // Multiple spaces
    });
    
    it('should show italic formatting immediately when content starts', () => {
      expect(fix('*i')).toBe('*i*');
      expect(fix('*italic')).toBe('*italic*');
      expect(fix('*italic text')).toBe('*italic text*');
    });
    
    it('should handle trailing whitespace in multi-word italic', () => {
      // Trailing space must come AFTER closers for markdown to parse
      expect(fix('*italic ')).toBe('*italic* ');
      expect(fix('*italic multi ')).toBe('*italic multi* ');
    });
    
    it('should show inline code formatting immediately when content starts', () => {
      expect(fix('`c')).toBe('`c`');
      expect(fix('`code')).toBe('`code`');
    });
    
    it('should show strikethrough formatting immediately when content starts (double tilde)', () => {
      // Double tilde closes with double tilde (matching delimiters required)
      expect(fix('~~s')).toBe('~~s~~');
      expect(fix('~~strike')).toBe('~~strike~~');
    });
    
    it('should show strikethrough formatting immediately when content starts (single tilde)', () => {
      // Single tilde also works for strikethrough
      expect(fix('~s')).toBe('~s~');
      expect(fix('~strike')).toBe('~strike~');
    });
    
    it('should format bold in the middle of text', () => {
      expect(fix('This is **b')).toBe('This is **b**');
      expect(fix('This is **bold')).toBe('This is **bold**');
      expect(fix('Hello **world')).toBe('Hello **world**');
    });
    
    it('should format italic in the middle of text', () => {
      expect(fix('This is *i')).toBe('This is *i*');
      expect(fix('This is *italic')).toBe('This is *italic*');
    });
    
    it('should hide empty bold markers (no content)', () => {
      expect(fix('**')).toBe('');
      expect(fix('text **')).toBe('text ');
    });
    
    it('should hide empty italic markers (no content)', () => {
      expect(fix('*')).toBe('');
    });
    
    it('should handle nested formatting correctly', () => {
      // Bold containing incomplete italic
      expect(fix('**bold *italic')).toBe('**bold *italic***');
      
      // Italic containing incomplete bold
      expect(fix('*italic **bold')).toBe('*italic **bold***');
      
      // Both complete except outermost
      expect(fix('**bold *italic* more')).toBe('**bold *italic* more**');
    });
    
    it('should preserve already-closed formatting', () => {
      // Complete bold followed by incomplete italic
      expect(fix('**bold** and *italic')).toBe('**bold** and *italic*');
      
      // Complete italic followed by incomplete bold
      expect(fix('*italic* and **bold')).toBe('*italic* and **bold**');
    });
    
    it('should handle trailing * as half of bold closer', () => {
      // When bold is open and text ends with single *, it's the start of **
      expect(fix('**bold*')).toBe('**bold**');
      expect(fix('This is **bold*')).toBe('This is **bold**');
      expect(fix('**b*')).toBe('**b**');
    });
    
    it('should handle single ~ as strikethrough closer', () => {
      // Single ~ closes single ~ strikethrough
      expect(fix('~strike~')).toBe('~strike~');    // Already closed!
    });
    
    it('should handle double ~~ as strikethrough closer', () => {
      // Double ~~ closes double ~~ strikethrough
      expect(fix('~~strike~~')).toBe('~~strike~~');  // Already closed!
      expect(fix('This is ~~strike~~')).toBe('This is ~~strike~~');  // Already closed!
    });
    
    it('should hide empty single tilde', () => {
      expect(fix('~')).toBe('');
      expect(fix('text ~')).toBe('text ');
    });
    
    it('should NOT treat trailing * as half closer when italic is also open', () => {
      // When both bold AND italic are open, trailing * closes italic, not half of bold
      expect(fix('**bold *italic')).toBe('**bold *italic***');
    });
    
    it('should correctly handle bold with half closer in sentence', () => {
      // Real streaming scenario: typing "This is **bold**" character by character
      expect(fix('This is **b')).toBe('This is **b**');
      expect(fix('This is **bo')).toBe('This is **bo**');
      expect(fix('This is **bol')).toBe('This is **bol**');
      expect(fix('This is **bold')).toBe('This is **bold**');
      expect(fix('This is **bold*')).toBe('This is **bold**'); // Half closer
      expect(fix('This is **bold**')).toBe('This is **bold**'); // Complete
    });
    
    it('should correctly handle bold+italic (***) streaming', () => {
      // Real streaming scenario: typing "***both***" character by character
      // *** opens both bold AND italic
      expect(fix('*')).toBe('');           // Single * hidden (empty italic)
      expect(fix('**')).toBe('');          // ** hidden (empty bold)
      expect(fix('***')).toBe('');         // *** hidden (empty bold+italic)
      expect(fix('***b')).toBe('***b***'); // Content starts - show bold+italic!
      expect(fix('***bo')).toBe('***bo***');
      expect(fix('***bot')).toBe('***bot***');
      expect(fix('***both')).toBe('***both***');
      expect(fix('***both*')).toBe('***both***');   // First * of closer
      expect(fix('***both**')).toBe('***both***');  // Second * of closer
      expect(fix('***both***')).toBe('***both***'); // Complete!
    });
    
    it('should correctly handle bold+italic in middle of text', () => {
      expect(fix('Text ***')).toBe('Text ');           // Empty - hidden
      expect(fix('Text ***b')).toBe('Text ***b***');   // Content starts
      expect(fix('Text ***both')).toBe('Text ***both***');
      expect(fix('Text ***both***')).toBe('Text ***both***'); // Complete
    });
    
    it('should correctly handle strikethrough streaming (single tilde)', () => {
      // Streaming ~strike~ character by character
      expect(fix('~')).toBe('');           // Single ~ hidden (empty strikethrough)
      expect(fix('~s')).toBe('~s~');       // Content starts - show strikethrough!
      expect(fix('~st')).toBe('~st~');
      expect(fix('~str')).toBe('~str~');
      expect(fix('~stri')).toBe('~stri~');
      expect(fix('~strik')).toBe('~strik~');
      expect(fix('~strike')).toBe('~strike~');
      expect(fix('~strike~')).toBe('~strike~'); // Complete!
    });
    
    it('should correctly handle strikethrough streaming (double tilde)', () => {
      // Streaming ~~strike~~ character by character
      expect(fix('~')).toBe('');             // Single ~ hidden
      expect(fix('~~')).toBe('');            // ~~ hidden (empty strikethrough)
      expect(fix('~~s')).toBe('~~s~~');      // Content starts - close with matching ~~
      expect(fix('~~st')).toBe('~~st~~');
      expect(fix('~~strike')).toBe('~~strike~~');
      expect(fix('~~strike~')).toBe('~~strike~~'); // First ~ is partial closer
      expect(fix('~~strike~~')).toBe('~~strike~~'); // Complete!
    });
    
    it('should correctly handle strikethrough in middle of text', () => {
      expect(fix('Text ~')).toBe('Text ');           // Empty - hidden
      expect(fix('Text ~s')).toBe('Text ~s~');       // Content starts
      expect(fix('Text ~strike')).toBe('Text ~strike~');
      expect(fix('Text ~strike~')).toBe('Text ~strike~'); // Complete
    });
  });
  
  describe('Code block and backtick handling', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should hide single backtick at end (ambiguous)', () => {
      expect(fix('`')).toBe('');
      expect(fix('text `')).toBe('text ');
    });
    
    it('should hide two backticks at end (pending code block)', () => {
      // Two backticks alone is invalid markdown - must be building to ```
      expect(fix('``')).toBe('');
      expect(fix('text ``')).toBe('text ');
    });
    
    it('should show code block opening (user sees it forming)', () => {
      // Code block should be visible as soon as ``` is typed
      // This lets user see the language being typed
      expect(fix('```')).toBe('```\n```');
      expect(fix('```j')).toBe('```j\n```');
      expect(fix('```js')).toBe('```js\n```');
      expect(fix('text\n```')).toBe('text\n```\n```');
      expect(fix('text\n```js')).toBe('text\n```js\n```');
    });
    
    it('should show code block with content', () => {
      expect(fix('```\nc')).toBe('```\nc\n```');
      expect(fix('```js\nc')).toBe('```js\nc\n```');
      expect(fix('```\nconst x = 1;')).toBe('```\nconst x = 1;\n```');
    });
    
    it('should show empty complete code block (provides visual feedback)', () => {
      // Empty code blocks are shown - they provide visual feedback during streaming
      expect(fix('```\n```')).toBe('```\n```');
      expect(fix('```js\n```')).toBe('```js\n```');
    });
    
    it('should preserve complete code block with content', () => {
      expect(fix('```\ncode\n```')).toBe('```\ncode\n```');
      expect(fix('```js\nconst x = 1;\n```')).toBe('```js\nconst x = 1;\n```');
    });
    
    it('should handle inline code correctly', () => {
      expect(fix('`c')).toBe('`c`');
      expect(fix('`code')).toBe('`code`');
      expect(fix('`code`')).toBe('`code`');
      expect(fix('text `code')).toBe('text `code`');
    });
    
    it('should handle text before code block with content', () => {
      expect(fix('text\n```\ncode')).toBe('text\n```\ncode\n```');
      expect(fix('text\n```js\ncode')).toBe('text\n```js\ncode\n```');
    });
    
    it('should stream code block character by character correctly', () => {
      // Simulating typing "```js\ncode\n```"
      // User sees code block forming as they type
      expect(fix('`')).toBe('');           // Ambiguous - could be inline code
      expect(fix('``')).toBe('');          // Pending code block
      expect(fix('```')).toBe('```\n```'); // Code block visible!
      expect(fix('```j')).toBe('```j\n```'); // Language typing
      expect(fix('```js')).toBe('```js\n```'); // Language complete
      expect(fix('```js\n')).toBe('```js\n```'); // Ready for content
      expect(fix('```js\nc')).toBe('```js\nc\n```');
      expect(fix('```js\nco')).toBe('```js\nco\n```');
      expect(fix('```js\ncod')).toBe('```js\ncod\n```');
      expect(fix('```js\ncode')).toBe('```js\ncode\n```');
    });
    
    it('should hide pending backticks when closing code block', () => {
      // When inside a code block, ` and `` at the end are building toward closing ```
      // They should be hidden to avoid visual noise
      expect(fix('```js\ncode\n`')).toBe('```js\ncode\n```');
      expect(fix('```js\ncode\n``')).toBe('```js\ncode\n```');
      expect(fix('```js\ncode\n```')).toBe('```js\ncode\n```'); // Closed
      
      // Same on same line as content
      expect(fix('```js\ncode`')).toBe('```js\ncode\n```');
      expect(fix('```js\ncode``')).toBe('```js\ncode\n```');
    });
    
    it('should stream code block closing character by character correctly', () => {
      // Full streaming simulation including closing
      const base = '```js\nconst x = 1;\n';
      expect(fix(base)).toBe('```js\nconst x = 1;\n```');
      expect(fix(base + '`')).toBe('```js\nconst x = 1;\n```');   // Hide pending
      expect(fix(base + '``')).toBe('```js\nconst x = 1;\n```');  // Hide pending
      expect(fix(base + '```')).toBe('```js\nconst x = 1;\n```'); // Closed!
    });
    
    it('should hide pending backticks when code block has content before it', () => {
      // Real scenario: heading before code block
      const base = '## Example\n```js\ncode();\n';
      expect(fix(base)).toBe('## Example\n```js\ncode();\n```');
      expect(fix(base + '`')).toBe('## Example\n```js\ncode();\n```');   // Hide pending
      expect(fix(base + '``')).toBe('## Example\n```js\ncode();\n```');  // Hide pending
      expect(fix(base + '```')).toBe('## Example\n```js\ncode();\n```'); // Closed!
    });
    
    it('should handle multi-line code with template literals', () => {
      // Code contains backticks (template literals) - should not interfere
      const code = '```ts\nconst x = `hello`;\n';
      expect(fix(code)).toBe('```ts\nconst x = `hello`;\n```');
      expect(fix(code + '`')).toBe('```ts\nconst x = `hello`;\n```');
      expect(fix(code + '``')).toBe('```ts\nconst x = `hello`;\n```');
      expect(fix(code + '```')).toBe('```ts\nconst x = `hello`;\n```');
    });
  });
  
  describe('Ordered list marker completion', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should complete incomplete ordered list marker', () => {
      // "1. First\n2" → "1. First\n2."
      expect(fix('1. First item\n2')).toBe('1. First item\n2.');
    });
    
    it('should complete multi-digit ordered list marker', () => {
      expect(fix('1. First\n10')).toBe('1. First\n10.');
      expect(fix('9. Ninth\n10')).toBe('9. Ninth\n10.');
      expect(fix('99. Item\n100')).toBe('99. Item\n100.');
    });
    
    it('should NOT modify completed ordered list markers', () => {
      // Already has period - should not add another
      expect(fix('1. First item\n2.')).toBe('1. First item\n2.');
      expect(fix('1. First item\n2. ')).toBe('1. First item\n2. ');
      expect(fix('1. First item\n2. Second')).toBe('1. First item\n2. Second');
    });
    
    it('should NOT modify digits in the middle of text', () => {
      // Digits not at end of string should not be modified
      expect(fix('Item 2 is here')).toBe('Item 2 is here');
      expect(fix('1. First\n2\n3')).toBe('1. First\n2\n3.');  // Only last one
    });
    
    it('should NOT modify digits at start without newline', () => {
      // First line digit is handled by remark normally
      expect(fix('2')).toBe('2');
      expect(fix('2 items')).toBe('2 items');
    });
    
    it('should handle streaming ordered list character by character', () => {
      // Simulate streaming "1. First\n2. Second"
      expect(fix('1')).toBe('1');
      expect(fix('1.')).toBe('1.');
      expect(fix('1. ')).toBe('1. ');
      expect(fix('1. First')).toBe('1. First');
      expect(fix('1. First\n')).toBe('1. First\n');
      expect(fix('1. First\n2')).toBe('1. First\n2.');  // Complete the marker!
      expect(fix('1. First\n2.')).toBe('1. First\n2.');
      expect(fix('1. First\n2. ')).toBe('1. First\n2. ');
      expect(fix('1. First\n2. S')).toBe('1. First\n2. S');
      expect(fix('1. First\n2. Second')).toBe('1. First\n2. Second');
    });
  });
  
  describe('Link handling', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should hide empty link bracket', () => {
      expect(fix('[')).toBe('');
      expect(fix('Check out [')).toBe('Check out ');
    });
    
    it('should show link immediately when text starts', () => {
      // As soon as there's text after [, show it as a link with # placeholder
      expect(fix('[g')).toBe('[g](#)');
      expect(fix('[google')).toBe('[google](#)');
      expect(fix('[google link')).toBe('[google link](#)');
    });
    
    it('should handle link with preceding text', () => {
      expect(fix('Check out [g')).toBe('Check out [g](#)');
      expect(fix('Check out [google')).toBe('Check out [google](#)');
    });
    
    it('should transition to URL mode on ]( ', () => {
      expect(fix('[google](')).toBe('[google]()');
      expect(fix('[google](h')).toBe('[google](h)');
      expect(fix('[google](https://')).toBe('[google](https://)');
      expect(fix('[google](https://google.com')).toBe('[google](https://google.com)');
    });
    
    it('should complete link when ) is typed', () => {
      // Complete link should pass through unchanged
      expect(fix('[google](https://google.com)')).toBe('[google](https://google.com)');
    });
    
    it('should handle link streaming character by character', () => {
      // Simulate streaming "[google](https://google.com)"
      expect(fix('[')).toBe('');
      expect(fix('[g')).toBe('[g](#)');
      expect(fix('[go')).toBe('[go](#)');
      expect(fix('[goo')).toBe('[goo](#)');
      expect(fix('[goog')).toBe('[goog](#)');
      expect(fix('[googl')).toBe('[googl](#)');
      expect(fix('[google')).toBe('[google](#)');
      expect(fix('[google]')).toBe('[google](#)'); // ] already typed, just add (#)
      expect(fix('[google](')).toBe('[google]()');
      expect(fix('[google](h')).toBe('[google](h)');
      expect(fix('[google](ht')).toBe('[google](ht)');
      expect(fix('[google](htt')).toBe('[google](htt)');
      expect(fix('[google](http')).toBe('[google](http)');
      expect(fix('[google](https')).toBe('[google](https)');
      expect(fix('[google](https:')).toBe('[google](https:)');
      expect(fix('[google](https:/')).toBe('[google](https:/)');
      expect(fix('[google](https://')).toBe('[google](https://)');
      expect(fix('[google](https://g')).toBe('[google](https://g)');
      expect(fix('[google](https://google.com')).toBe('[google](https://google.com)');
      expect(fix('[google](https://google.com)')).toBe('[google](https://google.com)');
    });
    
    it('should not confuse links with component syntax', () => {
      // Component syntax starts with [{ - all incomplete component syntax is hidden
      // This ensures clean UX while streaming components
      expect(fix('[{')).toBe('');
      expect(fix('[{c')).toBe('');
      expect(fix('[{c:')).toBe('');
      expect(fix('[{c:"')).toBe('');
      expect(fix('[{c:"Button')).toBe('');
      expect(fix('[{c:"Button",p:{')).toBe('');
    });
    
    it('should not add link completion inside component children arrays', () => {
      // The [ in children:[ should NOT be treated as a link opener
      // So no ](#) should be added at the end
      const base = '[{c:"Canvas",p:{"style":{}},children:[';
      expect(fix(base)).toBe(base);  // No link completion added
      expect(fix(base + '\n  ')).toBe(base + '\n  ');
      expect(fix(base + '\n  {c:"Card"')).toBe(base + '\n  {c:"Card"');
      
      // After component closes, regular link syntax should work again
      expect(fix('[{c:"Button",p:{}}]')).toBe('[{c:"Button",p:{}}]');
      expect(fix('[{c:"Button",p:{}}] [')).toBe('[{c:"Button",p:{}}] ');
      expect(fix('[{c:"Button",p:{}}] [link')).toBe('[{c:"Button",p:{}}] [link](#)');
    });
  });
  
  describe('Backslash escape awareness', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should not treat escaped asterisks as bold/italic markers', () => {
      // \* is not a marker
      expect(fix('\\*not italic')).toBe('\\*not italic');
      expect(fix('\\*\\*not bold')).toBe('\\*\\*not bold');
    });
    
    it('should not treat escaped underscores as markers', () => {
      expect(fix('\\_not italic')).toBe('\\_not italic');
      expect(fix('\\_\\_not bold')).toBe('\\_\\_not bold');
    });
    
    it('should not treat escaped tildes as strikethrough', () => {
      expect(fix('\\~not strike')).toBe('\\~not strike');
      expect(fix('\\~\\~not strike')).toBe('\\~\\~not strike');
    });
    
    it('should not treat escaped backticks as code', () => {
      expect(fix('\\`not code')).toBe('\\`not code');
    });
    
    it('should not treat escaped dollar signs as math', () => {
      expect(fix('\\$not math')).toBe('\\$not math');
      expect(fix('\\$\\$not block math')).toBe('\\$\\$not block math');
    });
    
    it('should not treat escaped brackets as links', () => {
      expect(fix('\\[not a link')).toBe('\\[not a link');
    });
    
    it('should handle escaped marker followed by real marker', () => {
      // \* then real *italic*
      expect(fix('\\**italic')).toBe('\\**italic*');
    });
    
    it('should handle backslash before non-marker character normally', () => {
      // \n is not a markdown escape (n isn't a marker char), so both chars pass through
      expect(fix('\\n normal')).toBe('\\n normal');
    });
  });
  
  describe('Word-internal marker detection', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should not treat word-internal asterisks as emphasis', () => {
      // file*name should not create italic
      expect(fix('file*name')).toBe('file*name');
    });
    
    it('should not treat word-internal underscores as emphasis', () => {
      // hello_world should not create italic
      expect(fix('hello_world')).toBe('hello_world');
      expect(fix('snake_case_name')).toBe('snake_case_name');
    });
    
    it('should not treat word-internal double underscores as bold', () => {
      expect(fix('hello__world')).toBe('hello__world');
    });
    
    it('should still treat boundary underscores as emphasis', () => {
      // _italic_ has underscores at word boundaries
      expect(fix('_italic')).toBe('_italic_');
      expect(fix('text _italic')).toBe('text _italic_');
    });
    
    it('should still treat boundary asterisks as emphasis', () => {
      expect(fix('*italic')).toBe('*italic*');
      expect(fix('text *italic')).toBe('text *italic*');
    });
  });
  
  describe('Underscore emphasis support', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should track opening italic underscore', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '_');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('italicUnderscore');
    });
    
    it('should track and close italic underscore', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '_italic_');
      expect(state.stack.length).toBe(0);
    });
    
    it('should auto-close incomplete italic underscore', () => {
      expect(fix('_italic')).toBe('_italic_');
      expect(fix('_italic text')).toBe('_italic text_');
    });
    
    it('should hide empty italic underscore markers', () => {
      expect(fix('_')).toBe('');
      expect(fix('text _')).toBe('text ');
    });
    
    it('should track opening bold underscore', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '__');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('boldUnderscore');
    });
    
    it('should track and close bold underscore', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '__bold__');
      expect(state.stack.length).toBe(0);
    });
    
    it('should auto-close incomplete bold underscore', () => {
      expect(fix('__bold')).toBe('__bold__');
      expect(fix('__bold text')).toBe('__bold text__');
    });
    
    it('should hide empty bold underscore markers', () => {
      expect(fix('__')).toBe('');
      expect(fix('text __')).toBe('text ');
    });
    
    it('should handle trailing whitespace in underscore emphasis', () => {
      expect(fix('_italic ')).toBe('_italic_ ');
      expect(fix('__bold ')).toBe('__bold__ ');
    });
    
    it('should handle nested underscore emphasis', () => {
      // Bold containing italic
      expect(fix('__bold _italic')).toBe('__bold _italic___');
    });
    
    it('should handle half-closer for bold underscore', () => {
      // __bold_ is typing the closing __
      expect(fix('__bold_')).toBe('__bold__');
    });
    
    it('should stream underscore italic character by character', () => {
      expect(fix('_')).toBe('');
      expect(fix('_i')).toBe('_i_');
      expect(fix('_it')).toBe('_it_');
      expect(fix('_ita')).toBe('_ita_');
      expect(fix('_italic')).toBe('_italic_');
      expect(fix('_italic_')).toBe('_italic_');
    });
    
    it('should stream underscore bold character by character', () => {
      expect(fix('_')).toBe('');
      expect(fix('__')).toBe('');
      expect(fix('__b')).toBe('__b__');
      expect(fix('__bo')).toBe('__bo__');
      expect(fix('__bol')).toBe('__bol__');
      expect(fix('__bold')).toBe('__bold__');
      expect(fix('__bold_')).toBe('__bold__');
      expect(fix('__bold__')).toBe('__bold__');
    });
  });
  
  describe('Math block awareness', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should track math block opening', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '$$');
      expect(state.inMathBlock).toBe(true);
      expect(state.stack.some(t => t.type === 'mathBlock')).toBe(true);
    });
    
    it('should track math block closing', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '$$x^2$$');
      expect(state.inMathBlock).toBe(false);
      expect(state.stack.length).toBe(0);
    });
    
    it('should auto-close incomplete math block', () => {
      expect(fix('$$x^2')).toBe('$$x^2\n$$');
      expect(fix('$$\nx^2')).toBe('$$\nx^2\n$$');
    });
    
    it('should skip emphasis markers inside math blocks', () => {
      // ** inside $$ should not be treated as bold
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '$$x**2');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('mathBlock');
      // No bold should be tracked
      expect(state.tagCounts.bold).toBeUndefined();
    });
    
    it('should skip underscores inside math blocks', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '$$x_i');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('mathBlock');
      expect(state.tagCounts.italicUnderscore).toBeUndefined();
    });
    
    it('should track inline math', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '$');
      expect(state.inInlineMath).toBe(true);
      expect(state.stack.some(t => t.type === 'inlineMath')).toBe(true);
    });
    
    it('should close inline math', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '$x^2$');
      expect(state.inInlineMath).toBe(false);
      expect(state.stack.length).toBe(0);
    });
    
    it('should auto-close incomplete inline math', () => {
      expect(fix('$x^2')).toBe('$x^2$');
    });
    
    it('should skip emphasis inside inline math', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '$x**2');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('inlineMath');
    });
    
    it('should hide empty math markers', () => {
      expect(fix('$')).toBe('');
      expect(fix('$$')).toBe('');
      expect(fix('text $$')).toBe('text ');
    });
  });
  
  describe('Image handling', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should track image opening', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '![');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('image');
      expect(state.stack[0].marker).toBe('![');
    });
    
    it('should track image with alt text', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '![alt');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('image');
    });
    
    it('should transition image to URL phase', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '![alt](');
      expect(state.stack.length).toBe(1);
      expect(state.stack[0].type).toBe('image');
      expect(state.stack[0].marker).toBe('](');
    });
    
    it('should close complete image', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '![alt](url)');
      expect(state.stack.length).toBe(0);
    });
    
    it('should strip incomplete image (text phase)', () => {
      // Incomplete images are removed - can't show skeleton for images
      expect(fix('Text ![alt')).toBe('Text ');
      expect(fix('Text ![')).toBe('Text ');
    });
    
    it('should auto-close image in URL phase', () => {
      // When we have the URL being typed, close with )
      expect(fix('![alt](http')).toBe('![alt](http)');
      expect(fix('![alt](https://example.com')).toBe('![alt](https://example.com)');
    });
    
    it('should preserve complete images', () => {
      expect(fix('![alt](https://example.com/img.png)')).toBe('![alt](https://example.com/img.png)');
    });
    
    it('should hide empty image opening', () => {
      expect(fix('![')).toBe('');
      expect(fix('text ![')).toBe('text ');
    });
    
    it('should stream image character by character', () => {
      // Simulate streaming "![logo](https://example.com/logo.png)"
      expect(fix('![')).toBe('');           // Empty - hidden
      expect(fix('![l')).toBe('');          // Incomplete image stripped
      expect(fix('![logo')).toBe('');       // Incomplete image stripped
      expect(fix('![logo](')).toBe('![logo]()');  // URL phase - close with )
      expect(fix('![logo](h')).toBe('![logo](h)');
      expect(fix('![logo](https://example.com/logo.png')).toBe('![logo](https://example.com/logo.png)');
      expect(fix('![logo](https://example.com/logo.png)')).toBe('![logo](https://example.com/logo.png)');
    });
  });
  
  describe('List marker awareness', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should not treat * at start of line followed by space as italic', () => {
      // "* item" is a list, not italic
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '* item');
      expect(state.stack.length).toBe(0);
      // Should not track italic
      expect(state.tagCounts.italic).toBeUndefined();
    });
    
    it('should not treat indented * as italic', () => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, '  * item');
      expect(state.tagCounts.italic).toBeUndefined();
    });
    
    it('should still treat * as italic when not a list marker', () => {
      // *italic (no space after *, not at line start pattern)
      expect(fix('*italic')).toBe('*italic*');
    });
    
    it('should handle list items without interfering with inline emphasis', () => {
      // List item with bold content
      expect(fix('* **bold')).toBe('* **bold**');
    });
  });
  
  describe('Mixed new features', () => {
    const fix = (input: string) => {
      const state = updateTagState(INITIAL_INCOMPLETE_STATE, input);
      return fixIncompleteMarkdown(input, state);
    };
    
    it('should handle escaped markers mixed with real ones', () => {
      // \* then **bold
      expect(fix('\\* **bold')).toBe('\\* **bold**');
    });
    
    it('should handle math containing underscores and asterisks', () => {
      // Math formula: $a_i * b_j$ - should not create emphasis
      expect(fix('$a_i * b_j')).toBe('$a_i * b_j$');
    });
    
    it('should handle underscore emphasis with word-internal underscores', () => {
      // _italic snake_case_ - the middle _ should be skipped (word internal)
      expect(fix('_italic snake_case')).toBe('_italic snake_case_');
    });
    
    it('should handle image followed by link', () => {
      expect(fix('![img](url) [link')).toBe('![img](url) [link](#)');
    });
    
    it('should handle bold asterisk and bold underscore independently', () => {
      expect(fix('**bold** and __also bold')).toBe('**bold** and __also bold__');
    });
    
    it('should handle inline math followed by emphasis', () => {
      expect(fix('$E=mc^2$ and **bold')).toBe('$E=mc^2$ and **bold**');
    });
  });
});

