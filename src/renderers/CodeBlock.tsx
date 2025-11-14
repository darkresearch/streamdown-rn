import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { ThemeConfig } from '../core/types';

interface CodeBlockProps {
  code: string;
  language?: string;
  theme: ThemeConfig;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, theme }) => {
  const [copied, setCopied] = useState(false);

  // Don't render empty code blocks
  if (!code || code.trim().length === 0) {
    return null;
  }

  // Trim trailing newlines to avoid extra space at bottom
  const trimmedCode = code.replace(/\n+$/, '');

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Use theme colors for all UI elements
  const backgroundColor = theme.colors.codeBlockBackground || theme.colors.codeBackground;
  const borderColor = theme.colors.codeBlockBorder || theme.colors.border;
  const headerBg = theme.colors.codeBlockHeaderBg || theme.colors.codeBackground;
  const headerText = theme.colors.codeBlockHeaderText || theme.colors.text;
  const copyButtonBg = theme.colors.codeBlockCopyButtonBg || theme.colors.border;
  const copyButtonText = theme.colors.codeBlockCopyButtonText || theme.colors.text;

  // Syntax highlighting colors from theme
  const syntaxStyle = {
    'hljs': {
      color: theme.colors.syntaxDefault,
      background: 'transparent',
    },
    'hljs-keyword': { color: theme.colors.syntaxKeyword },
    'hljs-built_in': { color: theme.colors.syntaxOperator },
    'hljs-type': { color: theme.colors.syntaxOperator },
    'hljs-literal': { color: theme.colors.syntaxNumber },
    'hljs-number': { color: theme.colors.syntaxNumber },
    'hljs-operator': { color: theme.colors.syntaxOperator },
    'hljs-string': { color: theme.colors.syntaxString },
    'hljs-regexp': { color: theme.colors.syntaxString },
    'hljs-comment': { color: theme.colors.syntaxComment },
    'hljs-function': { color: theme.colors.syntaxFunction },
    'hljs-title': { color: theme.colors.syntaxFunction },
    'hljs-params': { color: theme.colors.syntaxDefault },
    'hljs-attr': { color: theme.colors.syntaxString },
    'hljs-variable': { color: theme.colors.syntaxClass },
    'hljs-class': { color: theme.colors.syntaxClass },
  };

  return (
    <View style={[styles.container, { 
      backgroundColor,
      borderColor,
      borderWidth: 1,
      borderRadius: 28,
    }]}>
      {/* Header with language and copy button */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <Text style={[styles.language, { color: headerText }]}>
          {language || 'code'}
        </Text>
        <TouchableOpacity
          onPress={handleCopy}
          style={[styles.copyButton, { backgroundColor: copyButtonBg }]}
        >
          <Text style={[styles.copyButtonText, { color: copyButtonText }]}>
            {copied ? '✓ Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Code content with syntax highlighting */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <SyntaxHighlighter
          language={language || 'text'}
          style={syntaxStyle}
          highlighter="hljs"
          fontSize={13}
          fontFamily={theme.fonts.code || 'monospace'}
          customStyle={{
            backgroundColor: 'transparent',
            padding: 16,
            paddingTop: 8,
            margin: 0,
          }}
        >
          {trimmedCode}
        </SyntaxHighlighter>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,  // Slightly more space after code blocks
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  language: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  codeWrapper: {
    padding: 16,
    paddingTop: 8,
    minWidth: '100%',
  },
  codeText: {
    fontFamily: 'Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
    fontSize: 13,
    lineHeight: 20,
  },
});
