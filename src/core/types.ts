import { ComponentType } from 'react';
import { ViewStyle } from 'react-native';

/**
 * Component registry interface - matches existing registry structure
 */
export interface ComponentRegistry {
  get(name: string): ComponentDefinition | undefined;
  validate(name: string, props: any): ValidationResult;
  has(name: string): boolean;
}

/**
 * Component definition structure - matches existing registry
 */
export interface ComponentDefinition {
  name: string;
  component: ComponentType<any>;
  category: 'dynamic';
  description?: string;
  propsSchema: JSONSchema;
  examples?: any[];
}

/**
 * JSON Schema for prop validation - matches existing registry
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: JSONSchema;
  [key: string]: any;
}

/**
 * Validation result - matches existing registry
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  colors: {
    text: string;
    background: string;
    border: string;
    link: string;
    code: string;
    codeBackground: string;
    blockquote: string;
    strong: string;
    emphasis: string;
    // Syntax highlighting colors
    syntaxKeyword: string;
    syntaxString: string;
    syntaxNumber: string;
    syntaxComment: string;
    syntaxFunction: string;
    syntaxClass: string;
    syntaxOperator: string;
    syntaxDefault: string;
    // Code block UI colors
    codeBlockBackground?: string;
    codeBlockBorder?: string;
    codeBlockHeaderBg?: string;
    codeBlockHeaderText?: string;
    codeBlockCopyButtonBg?: string;
    codeBlockCopyButtonText?: string;
  };
  fonts: {
    body?: string;
    code?: string;
    heading?: string;
  };
  spacing: {
    paragraph: number;
    heading: number;
    list: number;
    code: number;
  };
}

/**
 * Component error for error handling
 */
export interface ComponentError {
  componentName: string;
  error: Error;
  props?: any;
}

/**
 * Incomplete tag tracking state (internal use only, not exported)
 * Used for performance optimization during streaming
 */
interface IncompleteTag {
  type: 'bold' | 'italic' | 'code' | 'codeBlock' | 'link' | 'component';
  position: number;        // absolute position in text where tag starts
  marker: string;          // opening marker: '**', '*', '`', '```', '[', '{{'
  openingText?: string;    // text around marker (for debugging)
}

/**
 * State for tracking incomplete markdown tags during streaming
 * Internal use only - not exposed in public API
 */
export interface IncompleteTagState {
  // Stack of incomplete tags (bottom = earliest, top = latest)
  stack: IncompleteTag[];
  
  // Cached value: position of earliest incomplete tag (bottom of stack)
  // If stack empty, equals previousTextLength (no incomplete tags)
  earliestPosition: number;
  
  // Previous text length to validate incremental updates
  previousTextLength: number;
  
  // Tag type counts for quick lookup
  tagCounts: {
    bold: number;
    italic: number;
    code: number;
    codeBlock: number;
    link: number;
    component: number;
  };
  
  // Code context tracking - are we inside code?
  inCodeBlock: boolean;
  inInlineCode: boolean;
}

/**
 * Initial state for incomplete tag tracking
 */
export const INITIAL_INCOMPLETE_STATE: IncompleteTagState = {
  stack: [],
  earliestPosition: 0,
  previousTextLength: 0,
  tagCounts: {
    bold: 0,
    italic: 0,
    code: 0,
    codeBlock: 0,
    link: 0,
    component: 0,
  },
  inCodeBlock: false,
  inInlineCode: false,
};

/**
 * Parsed component instance
 */
export interface ComponentInstance {
  id: string;
  name: string;
  component: ComponentType<any>;
  props: any;
  originalText: string;
}

/**
 * Markdown processing result
 */
export interface ProcessedMarkdown {
  markdown: string;
  components: ComponentInstance[];
}

/**
 * StreamdownRN component props
 */
export interface StreamdownRNProps {
  /** The streaming markdown content */
  children: string;
  /** Optional component registry for dynamic components */
  componentRegistry?: ComponentRegistry;
  /** Theme configuration */
  theme?: 'light' | 'dark' | ThemeConfig;
  /** Style overrides for markdown elements (deep merged with theme styles) */
  styleOverrides?: Partial<Record<string, any>>;
  /** Error handler for component failures */
  onComponentError?: (error: ComponentError) => void;
  /** Additional styling */
  style?: ViewStyle;
  /** Callback for state updates (dev/debugging only) */
  onStateUpdate?: (state: IncompleteTagState) => void;
}

