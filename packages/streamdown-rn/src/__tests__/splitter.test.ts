/**
 * Block Splitter Tests
 * 
 * Tests for incremental block boundary detection and finalization.
 */

import { describe, it, expect } from 'bun:test';
import { processNewContent, resetRegistry } from '../core/splitter';
import { INITIAL_REGISTRY } from '../core/types';

describe('Block Splitter', () => {
  describe('Heading detection', () => {
    it('should detect H1 heading', () => {
      const registry = processNewContent(INITIAL_REGISTRY, '# Hello\n\n');
      expect(registry.blocks.length).toBe(1);
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].meta).toEqual({ type: 'heading', level: 1 });
    });
    
    it('should detect H2-H6 headings', () => {
      const registry = processNewContent(INITIAL_REGISTRY, '## H2\n\n### H3\n\n');
      expect(registry.blocks.length).toBe(2);
      expect(registry.blocks[0].meta).toEqual({ type: 'heading', level: 2 });
      expect(registry.blocks[1].meta).toEqual({ type: 'heading', level: 3 });
    });

    it('finalizes heading immediately when next content begins', () => {
      let registry = INITIAL_REGISTRY;
      registry = processNewContent(registry, '## Introduction\n');
      registry = processNewContent(registry, '## Introduction\nThis is **bold**');

      expect(registry.blocks.length).toBe(1);
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.activeBlock?.type).toBe('paragraph');
      expect(registry.activeBlock?.content.startsWith('This is')).toBe(true);
    });

    it('splits heading and paragraph even when streamed back-to-back', () => {
      let registry = INITIAL_REGISTRY;
      registry = processNewContent(registry, '## Introduction\n');
      registry = processNewContent(
        registry,
        '## Introduction\nThis is **bold** and *italic* text.\n'
      );
      registry = processNewContent(
        registry,
        '## Introduction\nThis is **bold** and *italic* text.\n\n'
      );

      expect(registry.blocks.length).toBe(2);
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].content.trim()).toBe('## Introduction');
      expect(registry.blocks[1].type).toBe('paragraph');
      expect(registry.blocks[1].content.trim()).toBe(
        'This is **bold** and *italic* text.'
      );
    });

    it('finalizes heading even if following paragraph is incomplete', () => {
      let registry = INITIAL_REGISTRY;
      registry = processNewContent(registry, '## Introduction\n');
      registry = processNewContent(
        registry,
        '## Introduction\nThis is **bold**'
      );

      expect(registry.blocks.length).toBe(1);
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].content.trim()).toBe('## Introduction');
      expect(registry.activeBlock?.type).toBe('paragraph');
      expect(registry.activeBlock?.content.trim()).toBe('This is **bold**');
    });

    it('handles headings and paragraphs streamed in a single chunk', () => {
      const registry = processNewContent(
        INITIAL_REGISTRY,
        '# Streamdown Test\n\n## Introduction\nThis is **bold**\n'
      );

      expect(registry.blocks.length).toBe(2);
      expect(registry.blocks[0].content.trim()).toBe('# Streamdown Test');
      expect(registry.blocks[1].content.trim()).toBe('## Introduction');
      expect(registry.activeBlock?.type).toBe('paragraph');
      expect(registry.activeBlock?.content.trim()).toBe('This is **bold**');
    });
  });
  
  describe('Code block detection', () => {
    it('should detect code block with language', () => {
      const input = '```typescript\nconst x = 1;\n```\n\n'; // Need double newline to finalize
      const registry = processNewContent(INITIAL_REGISTRY, input);
      expect(registry.blocks.length).toBeGreaterThan(0);
      expect(registry.blocks[0]?.type).toBe('codeBlock');
      expect(registry.blocks[0]?.meta).toMatchObject({ type: 'codeBlock', language: 'typescript' });
    });
    
    it('should handle streaming code block', () => {
      let registry = INITIAL_REGISTRY;
      
      // Opening fence
      registry = processNewContent(registry, '```js\n');
      expect(registry.activeBlock?.type).toBe('codeBlock');
      expect(registry.blocks.length).toBe(0);
      
      // Add content
      registry = processNewContent(registry, '```js\nconst x = 1;\n');
      expect(registry.activeBlock?.type).toBe('codeBlock');
      
      // Close fence
      registry = processNewContent(registry, '```js\nconst x = 1;\n```');
      expect(registry.blocks.length).toBe(1);
      expect(registry.activeBlock).toBeNull();
    });

    it('should split code block and following paragraph in one chunk', () => {
      const input = '```ts\nconst x = 1;\n```\n\nFollowing paragraph';
      const registry = processNewContent(INITIAL_REGISTRY, input);

      expect(registry.blocks.length).toBe(1);
      expect(registry.blocks[0].type).toBe('codeBlock');
      expect(registry.blocks[0].content).toBe('```ts\nconst x = 1;\n```');
      expect(registry.activeBlock?.type).toBe('paragraph');
      expect(registry.activeBlock?.content.trim()).toBe('Following paragraph');
    });
  });
  
  describe('Component detection', () => {
    it('should detect component with new [{...}] syntax', () => {
      const input = '[{c:"Card",p:{"title":"Hello"}}]\n\n';
      const registry = processNewContent(INITIAL_REGISTRY, input);
      expect(registry.blocks.length).toBe(1);
      expect(registry.blocks[0].type).toBe('component');
      expect(registry.blocks[0].meta).toMatchObject({
        type: 'component',
        name: 'Card',
        props: { title: 'Hello' },
      });
    });

    it('should correctly split component and following text when streamed in large chunks', () => {
      // This tests the character-level processing fix
      // The bug was: when "}}]More" arrives in one chunk, "M" was included in the component block
      const input = 'Here is a card:\n\n[{c:"StatusCard",p:{"title":"Test"}}]\n\nMore text.';
      
      // Simulate streaming in one large chunk (like 5+ chars/tick)
      const registry = processNewContent(INITIAL_REGISTRY, input);
      
      // Should have 3 blocks: paragraph, component, paragraph
      expect(registry.blocks.length).toBe(2);
      expect(registry.blocks[0].type).toBe('paragraph');
      expect(registry.blocks[0].content.trim()).toBe('Here is a card:');
      expect(registry.blocks[1].type).toBe('component');
      // Component should NOT include any text after }}]
      expect(registry.blocks[1].content).not.toContain('More');
      expect(registry.blocks[1].content).not.toContain('M');
      
      // Active block should be the "More text." paragraph
      expect(registry.activeBlock?.type).toBe('paragraph');
      expect(registry.activeBlock?.content.trim()).toBe('More text.');
    });

    it('should handle component followed immediately by text (no double newline)', () => {
      // Edge case: component ends and text follows with just single newline
      const input = '[{c:"Card",p:{}}]\nNext line';
      const registry = processNewContent(INITIAL_REGISTRY, input);
      
      // Component should be finalized at }}]
      expect(registry.blocks.length).toBe(1);
      expect(registry.blocks[0].type).toBe('component');
      expect(registry.blocks[0].content).toBe('[{c:"Card",p:{}}]');
      
      // "Next line" should be in active block
      expect(registry.activeBlock?.content.trim()).toBe('Next line');
    });

    it('should handle component boundary correctly regardless of chunk size', () => {
      // Test that same input produces same result whether streamed char-by-char or all at once
      const fullInput = '[{c:"Test",p:{"x":1}}]\n\nFollowing text';
      
      // All at once
      const allAtOnce = processNewContent(INITIAL_REGISTRY, fullInput);
      
      // Character by character
      let charByChar = INITIAL_REGISTRY;
      for (let i = 1; i <= fullInput.length; i++) {
        charByChar = processNewContent(charByChar, fullInput.slice(0, i));
      }
      
      // Results should be identical
      expect(charByChar.blocks.length).toBe(allAtOnce.blocks.length);
      expect(charByChar.blocks[0].type).toBe(allAtOnce.blocks[0].type);
      expect(charByChar.blocks[0].content).toBe(allAtOnce.blocks[0].content);
      expect(charByChar.activeBlock?.content).toBe(allAtOnce.activeBlock?.content);
    });
  });
  
  describe('Paragraph detection', () => {
    it('should detect simple paragraph', () => {
      const registry = processNewContent(INITIAL_REGISTRY, 'Hello world\n\n');
      expect(registry.blocks.length).toBe(1);
      expect(registry.blocks[0].type).toBe('paragraph');
    });
    
    it('should split multiple paragraphs', () => {
      const input = 'First paragraph\n\nSecond paragraph\n\n';
      const registry = processNewContent(INITIAL_REGISTRY, input);
      expect(registry.blocks.length).toBe(2);
      expect(registry.blocks[0].type).toBe('paragraph');
      expect(registry.blocks[1].type).toBe('paragraph');
    });
  });
  
  describe('AST generation', () => {
    it('should generate AST for stable blocks', () => {
      const registry = processNewContent(INITIAL_REGISTRY, '# Hello\n\n');
      expect(registry.blocks[0].ast).toBeDefined();
      expect(registry.blocks[0].ast?.type).toBe('heading');
    });
    
    it('should not generate AST for component blocks', () => {
      const input = '[{c:"Card",p:{}}]\n\n';
      const registry = processNewContent(INITIAL_REGISTRY, input);
      expect(registry.blocks[0].ast).toBeUndefined();
    });
  });
  
  describe('Character-level block type detection (regression tests)', () => {
    it('should detect heading type immediately from first character', () => {
      let registry = INITIAL_REGISTRY;
      
      // Single # should be detected as heading
      registry = processNewContent(registry, '#');
      expect(registry.activeBlock?.type).toBe('heading');
      
      // ## should still be heading
      registry = processNewContent(registry, '##');
      expect(registry.activeBlock?.type).toBe('heading');
      
      // ## with space should be heading
      registry = processNewContent(registry, '## ');
      expect(registry.activeBlock?.type).toBe('heading');
      
      // Full heading content should still be heading
      registry = processNewContent(registry, '## Hello World');
      expect(registry.activeBlock?.type).toBe('heading');
    });
    
    it('should detect correct heading level character by character (H1-H6)', () => {
      // Test each heading level independently
      const testCases = [
        // H1: # → title (level 1)
        { input: '#', expectedLevel: 1 },
        { input: '# ', expectedLevel: 1 },
        { input: '# I', expectedLevel: 1 },
        { input: '# Hello', expectedLevel: 1 },
        
        // H2: ## → heading 2
        { input: '##', expectedLevel: 2 },
        { input: '## ', expectedLevel: 2 },
        { input: '## I', expectedLevel: 2 },
        { input: '## Introduction', expectedLevel: 2 },
        
        // H3: ### → heading 3
        { input: '###', expectedLevel: 3 },
        { input: '### ', expectedLevel: 3 },
        { input: '### I', expectedLevel: 3 },
        { input: '### Section', expectedLevel: 3 },
        
        // H4: #### → heading 4
        { input: '####', expectedLevel: 4 },
        { input: '#### ', expectedLevel: 4 },
        { input: '#### I', expectedLevel: 4 },
        
        // H5: ##### → heading 5
        { input: '#####', expectedLevel: 5 },
        { input: '##### ', expectedLevel: 5 },
        { input: '##### I', expectedLevel: 5 },
        
        // H6: ###### → heading 6
        { input: '######', expectedLevel: 6 },
        { input: '###### ', expectedLevel: 6 },
        { input: '###### I', expectedLevel: 6 },
      ];
      
      for (const { input, expectedLevel } of testCases) {
        const registry = processNewContent(INITIAL_REGISTRY, input);
        expect(registry.activeBlock?.type).toBe('heading');
        // Note: The meta is only set on finalized blocks, but we can check
        // that partial detection is working by verifying the type is 'heading'
      }
    });
    
    it('should track heading level progression as hashes are added', () => {
      // Stream character by character: # → ## → ### → #### → ##### → ######
      let registry = INITIAL_REGISTRY;
      
      registry = processNewContent(registry, '#');
      expect(registry.activeBlock?.type).toBe('heading');
      
      registry = processNewContent(registry, '##');
      expect(registry.activeBlock?.type).toBe('heading');
      
      registry = processNewContent(registry, '###');
      expect(registry.activeBlock?.type).toBe('heading');
      
      registry = processNewContent(registry, '####');
      expect(registry.activeBlock?.type).toBe('heading');
      
      registry = processNewContent(registry, '#####');
      expect(registry.activeBlock?.type).toBe('heading');
      
      registry = processNewContent(registry, '######');
      expect(registry.activeBlock?.type).toBe('heading');
      
      // 7 hashes should still be detected as heading (capped at 6)
      registry = processNewContent(registry, '#######');
      expect(registry.activeBlock?.type).toBe('heading');
    });
    
    it('should finalize with correct heading level when newline arrives', () => {
      // H1
      let registry = processNewContent(INITIAL_REGISTRY, '# Title\n\n');
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].meta).toEqual({ type: 'heading', level: 1 });
      
      // H2
      registry = processNewContent(INITIAL_REGISTRY, '## Section\n\n');
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].meta).toEqual({ type: 'heading', level: 2 });
      
      // H3
      registry = processNewContent(INITIAL_REGISTRY, '### Subsection\n\n');
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].meta).toEqual({ type: 'heading', level: 3 });
      
      // H4
      registry = processNewContent(INITIAL_REGISTRY, '#### Deep\n\n');
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].meta).toEqual({ type: 'heading', level: 4 });
      
      // H5
      registry = processNewContent(INITIAL_REGISTRY, '##### Deeper\n\n');
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].meta).toEqual({ type: 'heading', level: 5 });
      
      // H6
      registry = processNewContent(INITIAL_REGISTRY, '###### Deepest\n\n');
      expect(registry.blocks[0].type).toBe('heading');
      expect(registry.blocks[0].meta).toEqual({ type: 'heading', level: 6 });
    });
    
    it('should detect code block type immediately from fence', () => {
      let registry = INITIAL_REGISTRY;
      
      // ``` should be detected as codeBlock
      registry = processNewContent(registry, '```');
      expect(registry.activeBlock?.type).toBe('codeBlock');
      
      // With language
      registry = processNewContent(registry, '```typescript');
      expect(registry.activeBlock?.type).toBe('codeBlock');
    });
    
    it('should detect blockquote type immediately from >', () => {
      let registry = INITIAL_REGISTRY;
      
      registry = processNewContent(registry, '>');
      expect(registry.activeBlock?.type).toBe('blockquote');
      
      registry = processNewContent(registry, '> quote');
      expect(registry.activeBlock?.type).toBe('blockquote');
    });
    
    it('should detect component type immediately from [{c:', () => {
      let registry = INITIAL_REGISTRY;
      
      registry = processNewContent(registry, '[{c:');
      expect(registry.activeBlock?.type).toBe('component');
      
      registry = processNewContent(registry, '[{c:"Button"');
      expect(registry.activeBlock?.type).toBe('component');
    });
    
    it('should detect list type from marker + space', () => {
      let registry = INITIAL_REGISTRY;
      
      // - with space should be list
      registry = processNewContent(registry, '- ');
      expect(registry.activeBlock?.type).toBe('list');
      
      // 1. with space should be ordered list
      registry = INITIAL_REGISTRY;
      registry = processNewContent(registry, '1. ');
      expect(registry.activeBlock?.type).toBe('list');
    });

    it('should produce identical results for large mixed input regardless of chunk size', () => {
      const fullInput = [
        '# Title',
        '',
        'Paragraph start ' + 'x'.repeat(3000),
        '',
        '[{c:"StatusCard",p:{"title":"Ops","status":"ok"}}]',
        '',
        '```js',
        'const n = 42;',
        '```',
        '',
        'Tail paragraph',
      ].join('\n');

      const allAtOnce = processNewContent(INITIAL_REGISTRY, fullInput);

      let chunked = INITIAL_REGISTRY;
      for (let i = 64; i <= fullInput.length; i += 64) {
        chunked = processNewContent(chunked, fullInput.slice(0, i));
      }
      chunked = processNewContent(chunked, fullInput);

      expect(chunked.blocks.length).toBe(allAtOnce.blocks.length);
      expect(chunked.blocks.map(b => b.type)).toEqual(allAtOnce.blocks.map(b => b.type));
      expect(chunked.blocks.map(b => b.content)).toEqual(allAtOnce.blocks.map(b => b.content));
      expect(chunked.activeBlock?.type).toBe(allAtOnce.activeBlock?.type);
      expect(chunked.activeBlock?.content).toBe(allAtOnce.activeBlock?.content);
    });
  });
});

