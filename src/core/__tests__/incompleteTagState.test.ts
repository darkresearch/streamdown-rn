/**
 * Unit tests for incomplete tag state tracking
 */

import { updateIncompleteTagState } from '../parseIncomplete';
import { INITIAL_INCOMPLETE_STATE } from '../types';

describe('updateIncompleteTagState', () => {
  describe('Bold (**)', () => {
    it('should track opening bold tag', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'This is **');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('bold');
      expect(state.stack[0].position).toBe(8);
      expect(state.stack[0].marker).toBe('**');
      expect(state.earliestPosition).toBe(8);
      expect(state.tagCounts.bold).toBe(1);
    });

    it('should close bold tag when complete', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'This is **');
      state = updateIncompleteTagState(state, 'This is **bold**');
      
      expect(state.stack).toHaveLength(0);
      expect(state.earliestPosition).toBe(16); // text length when no incomplete tags
      expect(state.tagCounts.bold).toBe(0);
    });

    it('should track multiple bold tags', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'A **');
      state = updateIncompleteTagState(state, 'A **bold** and **');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].position).toBe(15); // "A **bold** and **" - second ** starts at position 15
      expect(state.tagCounts.bold).toBe(1);
    });
  });

  describe('Italic (*)', () => {
    it('should track opening italic tag', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'This is *');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('italic');
      expect(state.stack[0].position).toBe(8);
      expect(state.stack[0].marker).toBe('*');
      expect(state.tagCounts.italic).toBe(1);
    });

    it('should close italic tag when complete', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'This is *');
      state = updateIncompleteTagState(state, 'This is *italic*');
      
      expect(state.stack).toHaveLength(0);
      expect(state.tagCounts.italic).toBe(0);
    });

    it('should distinguish between * and **', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'This is **bold** and *');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('italic');
      expect(state.stack[0].position).toBe(21);
    });
  });

  describe('Code (`)', () => {
    it('should track opening code tag', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'This is `');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('code');
      expect(state.stack[0].position).toBe(8);
      expect(state.stack[0].marker).toBe('`');
      expect(state.tagCounts.code).toBe(1);
    });

    it('should close code tag when complete', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'This is `');
      state = updateIncompleteTagState(state, 'This is `code`');
      
      expect(state.stack).toHaveLength(0);
      expect(state.tagCounts.code).toBe(0);
    });
  });

  describe('Code blocks (```)', () => {
    it('should track opening code block', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '```');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('codeBlock');
      expect(state.stack[0].position).toBe(0);
      expect(state.stack[0].marker).toBe('```');
      expect(state.tagCounts.codeBlock).toBe(1);
    });

    it('should close code block when complete', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '```');
      state = updateIncompleteTagState(state, '```\ncode\n```');
      
      expect(state.stack).toHaveLength(0);
      expect(state.tagCounts.codeBlock).toBe(0);
    });

    it('should distinguish between ` and ```', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '`code` and ```');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('codeBlock');
      expect(state.stack[0].position).toBe(11);
    });
  });

  describe('Links ([text](url))', () => {
    it('should track opening link bracket', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'Click [');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('link');
      expect(state.stack[0].position).toBe(6);
      expect(state.stack[0].marker).toBe('[');
      expect(state.tagCounts.link).toBe(1);
    });

    it('should close link when complete', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'Click [');
      state = updateIncompleteTagState(state, 'Click [here](http://example.com)');
      
      expect(state.stack).toHaveLength(0);
      expect(state.tagCounts.link).toBe(0);
    });

    it('should keep link open until ) is found', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'Click [');
      state = updateIncompleteTagState(state, 'Click [here](');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('link');
    });
  });

  describe('Components ({{component:}})', () => {
    it('should track opening component tag', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '{{component:');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('component');
      expect(state.stack[0].position).toBe(0);
      expect(state.stack[0].marker).toBe('{{');
      expect(state.tagCounts.component).toBe(1);
    });

    it('should close component when }} is found', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '{{component:');
      state = updateIncompleteTagState(state, '{{component: "Button", props: {}}}');
      
      expect(state.stack).toHaveLength(0);
      expect(state.tagCounts.component).toBe(0);
    });

    it('should track ANY {{ as component when not in code', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '{{ test');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('component');
      expect(state.tagCounts.component).toBe(1);
    });
    
    it('should NOT track {{ when inside inline code', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '`{{ json');
      
      // Should have code tag but NO component tag
      expect(state.tagCounts.code).toBe(1);
      expect(state.tagCounts.component).toBe(0);
      expect(state.inInlineCode).toBe(true);
    });
    
    it('should NOT track {{ when inside code block', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '```\n{{ json');
      
      // Should have codeBlock tag but NO component tag
      expect(state.tagCounts.codeBlock).toBe(1);
      expect(state.tagCounts.component).toBe(0);
      expect(state.inCodeBlock).toBe(true);
    });
  });

  describe('Nesting scenarios', () => {
    it('should handle bold inside italic', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '*italic and **');
      
      expect(state.stack).toHaveLength(2);
      expect(state.stack[0].type).toBe('italic');
      expect(state.stack[1].type).toBe('bold');
      expect(state.earliestPosition).toBe(0); // First tag position
    });

    it('should handle italic inside bold', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '**bold and *');
      
      expect(state.stack).toHaveLength(2);
      expect(state.stack[0].type).toBe('bold');
      expect(state.stack[1].type).toBe('italic');
    });

    it('should handle formatting inside links', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '[**bold** text');
      
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('link');
    });

    it('should handle multiple incomplete tags of different types', () => {
      const state = updateIncompleteTagState(
        INITIAL_INCOMPLETE_STATE,
        'This is **bold and *italic and `code'
      );
      
      expect(state.stack).toHaveLength(3);
      expect(state.stack[0].type).toBe('bold');
      expect(state.stack[1].type).toBe('italic');
      expect(state.stack[2].type).toBe('code');
      expect(state.earliestPosition).toBe(8); // First bold tag
    });
  });

  describe('Incremental updates', () => {
    it('should handle character-by-character streaming', () => {
      let state = INITIAL_INCOMPLETE_STATE;
      
      // Stream "**bold**" character by character
      const text = '**bold**';
      for (let i = 1; i <= text.length; i++) {
        state = updateIncompleteTagState(state, text.slice(0, i));
      }
      
      expect(state.stack).toHaveLength(0);
      expect(state.tagCounts.bold).toBe(0);
    });

    it('should maintain state across multiple updates', () => {
      let state = INITIAL_INCOMPLETE_STATE;
      
      state = updateIncompleteTagState(state, 'This ');
      expect(state.stack).toHaveLength(0);
      
      state = updateIncompleteTagState(state, 'This is ');
      expect(state.stack).toHaveLength(0);
      
      state = updateIncompleteTagState(state, 'This is **');
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('bold');
      
      state = updateIncompleteTagState(state, 'This is **bold');
      expect(state.stack).toHaveLength(1);
      
      state = updateIncompleteTagState(state, 'This is **bold**');
      expect(state.stack).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '');
      
      expect(state.stack).toHaveLength(0);
      expect(state.previousTextLength).toBe(0);
    });

    it('should handle no new characters', () => {
      let state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'test');
      state = updateIncompleteTagState(state, 'test');
      
      expect(state.previousTextLength).toBe(4);
    });

    it('should calculate earliest position correctly', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, 'A **bold** and *italic and `code');
      
      expect(state.earliestPosition).toBe(15); // First incomplete tag (*italic)
    });

    it('should handle multiple consecutive markers', () => {
      const state = updateIncompleteTagState(INITIAL_INCOMPLETE_STATE, '****');
      
      // Should be treated as two bold tags
      expect(state.stack).toHaveLength(0);
      expect(state.tagCounts.bold).toBe(0);
    });
    
    it('should handle text with trailing space before closing tag', () => {
      let state = INITIAL_INCOMPLETE_STATE;
      
      // Simulate streaming "**bold " character by character
      const text = '**bold ';
      for (let i = 1; i <= text.length; i++) {
        state = updateIncompleteTagState(state, text.slice(0, i));
      }
      
      // Should still have unclosed bold tag with trailing space
      expect(state.stack).toHaveLength(1);
      expect(state.stack[0].type).toBe('bold');
    });
  });

  describe('Tag counts', () => {
    it('should track tag counts correctly', () => {
      const state = updateIncompleteTagState(
        INITIAL_INCOMPLETE_STATE,
        '**bold** *italic* `code` ```block``` [link]() {{component:}}'
      );
      
      expect(state.tagCounts.bold).toBe(0);
      expect(state.tagCounts.italic).toBe(0);
      expect(state.tagCounts.code).toBe(0);
      expect(state.tagCounts.codeBlock).toBe(0);
      expect(state.tagCounts.link).toBe(0);
      expect(state.tagCounts.component).toBe(0);
    });

    it('should track incomplete tag counts with code context', () => {
      // Use clearer test case: regular tags, then code block with content that looks like tags
      const state = updateIncompleteTagState(
        INITIAL_INCOMPLETE_STATE,
        '**bold** text ```\ncode {{ and [link\n```'
      );
      
      expect(state.tagCounts.bold).toBe(0); // Closed
      expect(state.tagCounts.codeBlock).toBe(0); // Closed
      expect(state.tagCounts.component).toBe(0); // Was inside code block, not tracked
      expect(state.tagCounts.link).toBe(0); // Was inside code block, not tracked
      expect(state.inCodeBlock).toBe(false); // Exited after closing
    });
    
    it('should track tags outside code, ignore inside code', () => {
      const state = updateIncompleteTagState(
        INITIAL_INCOMPLETE_STATE,
        '{{comp `{{ in code` {{outside'
      );
      
      expect(state.tagCounts.component).toBe(2); // First and last, middle was in code
      expect(state.tagCounts.code).toBe(0); // Closed
    });
    
    it('should track component outside code correctly', () => {
      const state = updateIncompleteTagState(
        INITIAL_INCOMPLETE_STATE,
        '**bold** and {{component text'
      );
      
      expect(state.tagCounts.bold).toBe(0); // Closed
      expect(state.tagCounts.component).toBe(1); // Open, not in code
    });
  });
});

