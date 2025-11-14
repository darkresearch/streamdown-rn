/**
 * GitHub Light Theme Configuration
 * Based on GitHub's light theme color palette
 */

import { ThemeConfig } from '../core/types';

export const lightTheme: ThemeConfig = {
  colors: {
    text: '#24292e',          // Dark text on light background
    background: '#ffffff',     // White background
    border: '#e1e4e8',         // Light border
    link: '#0366d6',          // Blue links
    code: '#24292e',          // Code text color
    codeBackground: '#f6f8fa', // Light code background
    blockquote: '#6a737d',    // Blockquote accent
    strong: '#24292e',        // Bold text
    emphasis: '#24292e',      // Italic text
    // Syntax highlighting colors (GitHub Light)
    syntaxKeyword: '#cf222e',  // Red for keywords
    syntaxString: '#0a3069',   // Dark blue for strings
    syntaxNumber: '#0550ae',   // Blue for numbers
    syntaxComment: '#6e7781',  // Gray for comments
    syntaxFunction: '#8250df', // Purple for functions
    syntaxClass: '#953800',    // Orange for classes
    syntaxOperator: '#cf222e', // Red for operators
    syntaxDefault: '#24292f',  // Default text color
    // Code block UI colors
    codeBlockBackground: '#f6f8fa',
    codeBlockBorder: '#e1e4e8',
    codeBlockHeaderBg: '#f6f8fa',
    codeBlockHeaderText: '#6e7781',
    codeBlockCopyButtonBg: '#e1e4e8',
    codeBlockCopyButtonText: '#24292e',
  },
  fonts: {
    body: undefined,          // Use system default
    code: 'monospace',        // System monospace
    heading: undefined,       // Use system default
  },
  spacing: {
    paragraph: 12,            // Space between paragraphs
    heading: 16,              // Space around headings
    list: 8,                  // Space between list items
    code: 12,                 // Space around code blocks
  },
};

/**
 * Light theme styles for react-native-markdown-display
 */
export const lightMarkdownStyles = {
  body: {
    color: lightTheme.colors.text,
    ...(lightTheme.fonts.body && { fontFamily: lightTheme.fonts.body }),
    fontSize: 16,
    lineHeight: 22,
    flexWrap: 'wrap' as const,
    flexShrink: 1,
  },
  heading1: {
    color: lightTheme.colors.text,
    ...(lightTheme.fonts.heading && { fontFamily: lightTheme.fonts.heading }),
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginTop: lightTheme.spacing.heading,
    marginBottom: lightTheme.spacing.paragraph,
  },
  heading2: {
    color: lightTheme.colors.text,
    ...(lightTheme.fonts.heading && { fontFamily: lightTheme.fonts.heading }),
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: lightTheme.spacing.heading,
    marginBottom: lightTheme.spacing.paragraph,
  },
  heading3: {
    color: lightTheme.colors.text,
    ...(lightTheme.fonts.heading && { fontFamily: lightTheme.fonts.heading }),
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginTop: lightTheme.spacing.heading,
    marginBottom: lightTheme.spacing.paragraph,
  },
  heading4: {
    color: lightTheme.colors.text,
    ...(lightTheme.fonts.heading && { fontFamily: lightTheme.fonts.heading }),
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginTop: lightTheme.spacing.heading,
    marginBottom: lightTheme.spacing.paragraph,
  },
  heading5: {
    color: lightTheme.colors.text,
    ...(lightTheme.fonts.heading && { fontFamily: lightTheme.fonts.heading }),
    fontSize: 14,
    fontWeight: 'bold' as const,
    marginTop: lightTheme.spacing.heading,
    marginBottom: lightTheme.spacing.paragraph,
  },
  heading6: {
    color: lightTheme.colors.text,
    ...(lightTheme.fonts.heading && { fontFamily: lightTheme.fonts.heading }),
    fontSize: 12,
    fontWeight: 'bold' as const,
    marginTop: lightTheme.spacing.heading,
    marginBottom: lightTheme.spacing.paragraph,
  },
  paragraph: {
    color: lightTheme.colors.text,
    ...(lightTheme.fonts.body && { fontFamily: lightTheme.fonts.body }),
    fontSize: 16,
    lineHeight: 22,
    marginBottom: lightTheme.spacing.paragraph,
    flexWrap: 'wrap' as const,
    flexShrink: 1,
  },
  strong: {
    color: lightTheme.colors.strong,
    fontWeight: 'bold' as const,
    flexWrap: 'wrap' as const,
    flexShrink: 1,
  },
  em: {
    color: lightTheme.colors.emphasis,
    fontStyle: 'italic' as const,
    flexWrap: 'wrap' as const,
    flexShrink: 1,
  },
  link: {
    color: lightTheme.colors.link,
    textDecorationLine: 'underline' as const,
    flexWrap: 'wrap' as const,
    flexShrink: 1,
  },
  code_inline: {
    color: lightTheme.colors.text,  // Same as regular text
    backgroundColor: 'transparent',  // No background, blend into chat
    ...(lightTheme.fonts.code && { fontFamily: lightTheme.fonts.code }),
    fontSize: 16,  // Match body text size
    lineHeight: 22,  // Match body line height
    borderWidth: 0,  // No border
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    flexWrap: 'wrap' as const,
    flexShrink: 1,
    // Web-specific: force long strings (like Solana addresses) to wrap
    wordBreak: 'break-all' as any,
    overflowWrap: 'anywhere' as any,
  },
  code_block: {
    color: lightTheme.colors.code,
    backgroundColor: lightTheme.colors.codeBackground,
    ...(lightTheme.fonts.code && { fontFamily: lightTheme.fonts.code }),
    fontSize: 13,  // Slightly smaller like ChatGPT
    padding: 12,  // More consistent padding
    borderRadius: 6,  // Slightly tighter radius
    marginVertical: 8,  // Tighter spacing
    overflowX: 'auto' as const,
    maxWidth: '100%',
  },
  fence: {
    color: lightTheme.colors.code,
    backgroundColor: lightTheme.colors.codeBackground,
    ...(lightTheme.fonts.code && { fontFamily: lightTheme.fonts.code }),
    fontSize: 13,  // Slightly smaller like ChatGPT
    padding: 12,  // More consistent padding
    borderRadius: 28,  // Rounder corners like ChatGPT
    borderWidth: 1,
    borderColor: lightTheme.colors.codeBlockBorder || lightTheme.colors.border,
    marginVertical: 0,  // No extra spacing - CodeBlock handles its own margins
    overflowX: 'auto' as const,
    maxWidth: '100%',
  },
  blockquote: {
    borderLeftColor: lightTheme.colors.blockquote,
    borderLeftWidth: 4,
    paddingLeft: 12,
    marginVertical: lightTheme.spacing.paragraph,
    fontStyle: 'italic' as const,
  },
  list_item: {
    color: lightTheme.colors.text,
    marginBottom: lightTheme.spacing.list,
    flexWrap: 'wrap' as const,
    flexShrink: 1,
  },
  bullet_list: {
    marginVertical: lightTheme.spacing.paragraph,
  },
  ordered_list: {
    marginVertical: lightTheme.spacing.paragraph,
  },
  hr: {
    backgroundColor: lightTheme.colors.border,
    height: 1,
    marginVertical: lightTheme.spacing.heading,
  },
  table: {
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    marginVertical: lightTheme.spacing.paragraph,
    overflowX: 'auto' as const,
    maxWidth: '100%',
    display: 'block' as const,
    width: '100%',
    borderCollapse: 'collapse' as any,
  },
  th: {
    backgroundColor: 'transparent',
    color: lightTheme.colors.text,
    fontWeight: '600' as any,
    fontSize: 14,  // Slightly larger for better readability
    padding: 8,
    paddingBottom: 10,
    borderColor: lightTheme.colors.border,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    textAlign: 'left' as any,
    whiteSpace: 'nowrap' as any,  // Never wrap within cells - table scrolls instead
    // Web: responsive sizing - scales down on mobile via CSS
    '@media (max-width: 640px)': {
      fontSize: 12,
      padding: 6,
      paddingBottom: 8,
    },
  } as any,
  td: {
    color: lightTheme.colors.text,
    fontSize: 14,  // Slightly larger for better readability
    padding: 8,
    paddingVertical: 10,
    borderColor: lightTheme.colors.border,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    textAlign: 'left' as any,
    whiteSpace: 'nowrap' as any,  // Never wrap within cells - table scrolls instead
    // Web: responsive sizing - scales down on mobile via CSS
    '@media (max-width: 640px)': {
      fontSize: 12,
      padding: 6,
      paddingVertical: 8,
    },
  } as any,
};
