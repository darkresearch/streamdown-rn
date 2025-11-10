import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import SyntaxHighlighter from 'react-native-syntax-highlighter';

interface CodeBlockProps {
  code: string;
  language?: string;
  theme: 'dark' | 'light';
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

  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#101A29' : '#f5f5f5';
  const borderColor = isDark ? '#1a2433' : '#e8e8e8'; // Barely lighter than background
  const headerBg = isDark ? '#0d1520' : '#ececec';
  const headerText = isDark ? '#8C9DB8' : '#666666';
  const copyButtonBg = isDark ? '#1a2433' : '#e0e0e0';
  const copyButtonText = isDark ? '#DCE9FF' : '#333333';

  // GitHub Dark-inspired syntax colors
  const syntaxStyle = isDark ? {
    'hljs': {
      color: '#C9D1D9',
      background: 'transparent',
    },
    'hljs-keyword': { color: '#FF7B72' },       // Red for keywords
    'hljs-built_in': { color: '#79C0FF' },     // Blue for built-ins
    'hljs-type': { color: '#79C0FF' },         // Blue for types
    'hljs-literal': { color: '#79C0FF' },      // Blue for literals
    'hljs-number': { color: '#79C0FF' },       // Blue for numbers
    'hljs-operator': { color: '#FF7B72' },     // Red for operators
    'hljs-string': { color: '#A5D6FF' },       // Light blue for strings
    'hljs-regexp': { color: '#7EE787' },       // Green for regex
    'hljs-comment': { color: '#8B949E' },      // Gray for comments
    'hljs-function': { color: '#D2A8FF' },     // Purple for functions
    'hljs-title': { color: '#D2A8FF' },        // Purple for titles
    'hljs-params': { color: '#C9D1D9' },       // Default for params
    'hljs-attr': { color: '#7EE787' },         // Green for attributes
    'hljs-variable': { color: '#FFA657' },     // Orange for variables
    'hljs-class': { color: '#FFA657' },        // Orange for classes
  } : {
    'hljs': {
      color: '#24292F',
      background: 'transparent',
    },
    'hljs-keyword': { color: '#CF222E' },
    'hljs-built_in': { color: '#0550AE' },
    'hljs-type': { color: '#0550AE' },
    'hljs-literal': { color: '#0550AE' },
    'hljs-number': { color: '#0550AE' },
    'hljs-operator': { color: '#CF222E' },
    'hljs-string': { color: '#0A3069' },
    'hljs-regexp': { color: '#116329' },
    'hljs-comment': { color: '#6E7781' },
    'hljs-function': { color: '#8250DF' },
    'hljs-title': { color: '#8250DF' },
    'hljs-params': { color: '#24292F' },
    'hljs-attr': { color: '#116329' },
    'hljs-variable': { color: '#953800' },
    'hljs-class': { color: '#953800' },
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
          fontFamily="Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
          PreTag={ScrollView}
          CodeTag={ScrollView}
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
