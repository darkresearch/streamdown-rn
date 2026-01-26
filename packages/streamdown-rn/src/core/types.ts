/**
 * Core Types for Streamdown-RN
 * 
 * Block-based streaming markdown architecture.
 * Optimized for append-only AI response streams.
 */

import type { ComponentType, ReactNode } from 'react';
import type { Content } from 'mdast';

// ============================================================================
// Block Types
// ============================================================================

/**
 * All supported block types in GitHub Flavored Markdown
 */
export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'codeBlock'
  | 'list'
  | 'table'
  | 'blockquote'
  | 'horizontalRule'
  | 'image'
  | 'footnote'
  | 'component';  // Custom {{c:...}} syntax

/**
 * Heading levels (H1-H6)
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// ============================================================================
// Block Interfaces
// ============================================================================

/**
 * Base block properties shared by all blocks
 */
interface BaseBlock {
  /** Unique stable identifier (e.g., "h-0", "p-1") */
  id: string;
  /** Block type for rendering dispatch */
  type: BlockType;
  /** Raw markdown content of this block */
  content: string;
  /** Fast hash of content for React.memo comparison */
  contentHash: number;
  /** Start position in the full text */
  startPos: number;
  /** End position in the full text */
  endPos: number;
}

/**
 * A completed, immutable block that will never change.
 * These are memoized and never re-render.
 */
export interface StableBlock extends BaseBlock {
  /** Block-specific metadata */
  meta: BlockMeta;
  /** Parsed MDAST node (cached for performance) */
  ast?: Content;
}

/**
 * The currently streaming block (only one at a time).
 * Re-renders on each new token.
 */
export interface ActiveBlock {
  /** Type hint (may change as more content arrives) */
  type: BlockType | null;
  /** Current content being streamed */
  content: string;
  /** Start position in the full text */
  startPos: number;
}

/**
 * Block-specific metadata
 */
export type BlockMeta =
  | { type: 'heading'; level: HeadingLevel }
  | { type: 'codeBlock'; language: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'component'; name: string; props: Record<string, unknown> }
  | { type: 'paragraph' | 'blockquote' | 'horizontalRule' | 'image' | 'footnote' };

// ============================================================================
// Block Registry (State Management)
// ============================================================================

// Forward declare for circular dependency avoidance
export interface IncompleteTagState {
  stack: Array<{ type: string; position: number; marker: string }>;
  tagCounts: Record<string, number>;
  previousTextLength: number;
  earliestPosition: number;
  inCodeBlock: boolean;
  inInlineCode: boolean;
  inMathBlock: boolean;
  inInlineMath: boolean;
}

/**
 * Central state for the streaming renderer.
 * Immutable updates — each token creates a new registry.
 */
export interface BlockRegistry {
  /** Completed blocks (never change after finalization) */
  blocks: readonly StableBlock[];
  /** Currently streaming block (null if between blocks) */
  activeBlock: ActiveBlock | null;
  /** Tag state for active block (tracks incomplete markdown) */
  activeTagState: IncompleteTagState;
  /** Cursor position — how much of the full text we've processed */
  cursor: number;
  /** Counter for generating unique block IDs */
  blockCounter: number;
}

/**
 * Initial empty registry state
 * Note: activeTagState is set to a literal to avoid circular dependency
 */
export const INITIAL_REGISTRY: BlockRegistry = {
  blocks: [],
  activeBlock: null,
  activeTagState: {
    stack: [],
    tagCounts: {},
    previousTextLength: 0,
    earliestPosition: 0,
    inCodeBlock: false,
    inInlineCode: false,
    inMathBlock: false,
    inInlineMath: false,
  },
  cursor: 0,
  blockCounter: 0,
};

// ============================================================================
// Component Injection
// ============================================================================

/**
 * Definition of a component that can be injected via [{c:...}] syntax
 */
export interface ComponentDefinition<P = Record<string, unknown>> {
  /** The React component to render */
  component: ComponentType<P & { _isStreaming?: boolean; children?: ReactNode }>;
  /** 
   * Skeleton component to render while streaming.
   * Receives partial props available so far.
   * Should render skeleton placeholders for missing props.
   */
  skeletonComponent?: ComponentType<Partial<P> & { _isStreaming?: boolean; children?: ReactNode }>;
  /** JSON schema for props validation (optional) */
  schema?: JSONSchema;
}

/**
 * Registry of injectable components
 */
export interface ComponentRegistry {
  /** Get a component by name */
  get(name: string): ComponentDefinition | undefined;
  /** Check if a component exists */
  has(name: string): boolean;
  /** Validate props against schema */
  validate(name: string, props: unknown): ValidationResult;
}

/**
 * Simple JSON Schema subset for prop validation
 */
export interface JSONSchema {
  type: 'object';
  properties: Record<string, { type: string; required?: boolean }>;
  required?: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Theme Configuration
// ============================================================================

/**
 * Theme colors
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  codeBackground: string;
  codeForeground: string;
  border: string;
  link: string;
  // Syntax highlighting colors (Prism-compatible)
  syntaxDefault: string;
  syntaxKeyword: string;
  syntaxString: string;
  syntaxNumber: string;
  syntaxComment: string;
  syntaxFunction: string;
  syntaxClass: string;
  syntaxOperator: string;
}

/**
 * Theme configuration
 * 
 * Font-agnostic: regular and bold fonts are optional (undefined uses platform defaults).
 * Only mono is required for code blocks.
 */
export interface ThemeConfig {
  colors: ThemeColors;
  fonts: {
    regular?: string;   // Optional - uses platform default if undefined
    bold?: string;      // Optional - uses platform default if undefined
    mono: string;       // Required for code blocks
  };
  spacing: {
    block: number;      // Space between blocks
    inline: number;     // Inline element spacing
    indent: number;     // List/blockquote indent
  };
}

// ============================================================================
// Debug/Observability
// ============================================================================

/**
 * Snapshot of the streaming state at a specific moment.
 * Emitted via onDebug callback for observability.
 */
export interface DebugSnapshot {
  /** Current position in the stream (cursor) */
  position: number;
  /** Total length of content processed so far */
  totalLength: number;
  /** New characters added in this update */
  newChars: string;
  /** Number of characters added */
  newCharsCount: number;
  /** Current block registry state (deep copy for safety) */
  registry: {
    /** Number of stable blocks */
    stableBlockCount: number;
    /** Stable blocks with preview content */
    stableBlocks: Array<{
      id: string;
      type: BlockType;
      contentLength: number;
      content: string;
    }>;
    /** Active block info */
    activeBlock: {
      type: BlockType | null;
      contentLength: number;
      content: string;
    } | null;
    /** Current tag state for incomplete markdown tracking */
    tagState: IncompleteTagState;
  };
  /** Fixed markdown content (after auto-closing incomplete tags) */
  fixedContent: string | null;
  /** Timestamp (high-resolution) */
  timestamp: number;
  /** Time since last update in milliseconds */
  deltaMs: number;
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for the main StreamdownRN component
 */
export interface StreamdownRNProps {
  /** Markdown content (streaming or complete) */
  children: string;
  /** Component registry for {{c:...}} syntax */
  componentRegistry?: ComponentRegistry;
  /** Theme name or custom config */
  theme?: 'dark' | 'light' | ThemeConfig;
  /** Container style */
  style?: object;
  /** Error callback for component failures */
  onError?: (error: Error, componentName?: string) => void;
  /** 
   * Debug callback — called on every content update.
   * Use for observability, debugging, or testing.
   * Only enable in development to avoid performance overhead.
   */
  onDebug?: (snapshot: DebugSnapshot) => void;
  /**
   * Signal that streaming is complete.
   * When true, finalizes the active block into a stable block.
   * This ensures the last block is properly memoized and components
   * transition from skeleton to final state.
   */
  isComplete?: boolean;
}

/**
 * Props passed to block renderers
 */
export interface BlockRendererProps {
  /** The block to render */
  block: StableBlock;
  /** Current theme configuration */
  theme: ThemeConfig;
  /** Component registry (for component blocks) */
  componentRegistry?: ComponentRegistry;
}

/**
 * Props for the active block renderer
 */
export interface ActiveBlockRendererProps {
  /** The active block content */
  block: ActiveBlock;
  /** Current theme configuration */
  theme: ThemeConfig;
  /** Component registry (for streaming components) */
  componentRegistry?: ComponentRegistry;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Fast hash function (djb2) for content comparison.
 * Used in React.memo to avoid deep equality checks.
 */
export function hashContent(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Ensure unsigned
}

/**
 * Generate a unique block ID
 */
export function generateBlockId(type: BlockType, counter: number): string {
  const prefix = type === 'heading' ? 'h' :
                 type === 'paragraph' ? 'p' :
                 type === 'codeBlock' ? 'c' :
                 type === 'list' ? 'l' :
                 type === 'table' ? 't' :
                 type === 'blockquote' ? 'q' :
                 type === 'horizontalRule' ? 'hr' :
                 type === 'image' ? 'img' :
                 type === 'component' ? 'cmp' : 'b';
  return `${prefix}-${counter}`;
}

