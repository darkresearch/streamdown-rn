/**
 * StreamdownRN - React Native Streaming Markdown Renderer
 * 
 * A streaming-first markdown renderer with dynamic component injection,
 * inspired by Vercel's Streamdown but built specifically for React Native.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text } from 'react-native';

import { StreamdownRNProps, ThemeConfig, ComponentInstance } from './core/types';
import { optimizeForStreaming } from './core/parseIncomplete';
import { extractComponents, injectComponentPlaceholders } from './core/componentInjector';
import { darkTheme, darkMarkdownStyles } from './themes/dark';
import { lightTheme, lightMarkdownStyles } from './themes/light';
import { MarkdownRenderer } from './renderers/MarkdownRenderer';
import { CodeBlock } from './renderers/CodeBlock';

/**
 * Get theme configuration
 */
function getTheme(theme: StreamdownRNProps['theme']): {
  config: ThemeConfig;
  markdownStyles: any;
} {
  if (typeof theme === 'object') {
    // Custom theme object - uses dark styles as base
    return {
      config: theme,
      markdownStyles: darkMarkdownStyles,
    };
  }
  
  switch (theme) {
    case 'light':
      return {
        config: lightTheme,
        markdownStyles: lightMarkdownStyles,
      };
    case 'dark':
    default:
      return {
        config: darkTheme,
        markdownStyles: darkMarkdownStyles,
      };
  }
}

/**
 * StreamdownRN Component
 */
export const StreamdownRN: React.FC<StreamdownRNProps> = React.memo(({
  children,
  componentRegistry,
  theme = 'dark',
  onComponentError,
  style,
}) => {
  console.log('🚀 StreamdownRN called with:', {
    textLength: children?.length || 0,
    textPreview: children?.substring(0, 200),
    hasRegistry: !!componentRegistry,
    theme
  });

  // Process markdown with streaming optimizations
  const processedContent = useMemo(() => {
    if (!children || children.length === 0) {
      return { markdown: '', components: [] };
    }

    console.log('🔄 Processing markdown content...');

    // Fix incomplete markdown for streaming
    const optimizedMarkdown = optimizeForStreaming(children);
    
    console.log('✅ Optimized markdown:', optimizedMarkdown.substring(0, 300));
    
    // Extract and process components
    const result = extractComponents(optimizedMarkdown, componentRegistry, onComponentError);
    
    console.log('📊 Extraction result:', {
      componentsFound: result.components.length,
      componentNames: result.components.map(c => c.name)
    });
    
    return result;
  }, [children, componentRegistry, onComponentError]);

  // Get theme configuration
  const { markdownStyles } = useMemo(() => {
    return getTheme(theme);
  }, [theme]);

  // Render component instances
  const renderComponent = useCallback((componentInstance: ComponentInstance) => {
    const { component: Component, props, id, name } = componentInstance;
    
    try {
      // Render inline without extra wrapper View for truly inline components
      return <Component key={id} {...props} />;
    } catch (error) {
      // Handle component rendering errors gracefully
      const componentError = {
        componentName: name,
        error: error instanceof Error ? error : new Error(String(error)),
        props,
      };
      
      onComponentError?.(componentError);
      
      // Render error fallback inline
      return (
        <Text key={id} style={{ color: '#ff3333', fontSize: 14 }}>
          ⚠️ Error: {name}
        </Text>
      );
    }
  }, [onComponentError]);

  // Custom markdown rules for component injection and code blocks
  const customRules = useMemo(() => {
    const rules: any = {};

    if (processedContent.components.length > 0) {
      // Create a map of components by ID for quick lookup
      const componentMap = new Map(
        processedContent.components.map(comp => [comp.id, comp])
      );

      // Custom inline code renderer to intercept component markers
      rules.code_inline = (node: any, _children: any, _parent: any, styles: any) => {
        const codeContent = node.content || '';
        
        console.log('💻 code_inline rule triggered:', {
          content: codeContent,
          isComponentMarker: /__COMPONENT__/.test(codeContent)
        });

        // Check if this is a component marker
        const markerMatch = codeContent.match(/__COMPONENT__([^_]+)__([^_]+)__/);
        
        if (markerMatch) {
          const componentId = markerMatch[1];
          const componentName = markerMatch[2];
          
          console.log('🎯 Found component marker in code_inline:', { componentId, componentName });
          
          const componentInstance = componentMap.get(componentId);
          
          if (componentInstance) {
            console.log('✅ Rendering component inline:', componentInstance.name);
            return renderComponent(componentInstance);
          } else {
            console.warn('⚠️ Component not found in map:', componentId);
          }
        }
        
        // Not a component marker, render as regular inline code
        return <Text key={node.key} style={styles.code_inline}>{codeContent}</Text>;
      };

      // Custom paragraph renderer that keeps components inline
      rules.paragraph = (node: any, children: any, _parent: any, styles: any) => {
        // DEBUG: Log what we receive
        console.log('📝 Paragraph rule triggered:', {
          nodeContent: node.content?.substring(0, 200),
          nodeType: node.type,
          childrenCount: React.Children.count(children),
          nodeKeys: Object.keys(node),
          fullNode: node, // Log the entire node object
        });
        
        // Check if this paragraph contains component markers
        // NOTE: Backticks are stripped by markdown parser, match raw markers
        const textContent = node.content || '';
        const hasComponentMarker = /__COMPONENT__/.test(textContent);
        
        console.log('🔍 Has component marker?', hasComponentMarker);
        console.log('🔍 Text content preview:', textContent.substring(0, 300));
        console.log('🔍 Full node content:', node.content);
        console.log('🔍 Children content:', children);
        console.log('🔍 Children type:', typeof children);
        console.log('🔍 Children length:', Array.isArray(children) ? children.length : 'not array');
        
        if (!hasComponentMarker) {
          // Regular paragraph without components
          return <Text key={node.key} style={styles.paragraph}>{children}</Text>;
        }
        
        console.log('✨ Parsing paragraph with components...');
        
        // Parse paragraph and render text + components inline
        const segments: any[] = [];
        // Match WITHOUT backticks: __COMPONENT__ID__NAME__
        const markerPattern = /__COMPONENT__([^_]+)__([^_]+)__/g;
        let lastIndex = 0;
        let match;
        
        while ((match = markerPattern.exec(textContent)) !== null) {
          const componentId = match[1];
          const componentName = match[2];
          
          console.log('🎯 Matched component:', { componentId, componentName, matchIndex: match.index });
          
          // Add text before component
          if (match.index > lastIndex) {
            segments.push({
              type: 'text',
              content: textContent.substring(lastIndex, match.index)
            });
          }
          
          // Add component
          const componentInstance = componentMap.get(componentId);
          if (componentInstance) {
            segments.push({
              type: 'component',
              content: componentInstance
            });
          }
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < textContent.length) {
          segments.push({
            type: 'text',
            content: textContent.substring(lastIndex)
          });
        }
        
        console.log('📦 Segments created:', segments.length, segments.map(s => ({
          type: s.type,
          contentPreview: s.type === 'text' ? s.content.substring(0, 50) : s.content.name
        })));
        
        // Render all segments in a single Text component for true inline flow
        return (
          <Text key={node.key} style={styles.paragraph}>
            {segments.map((segment, idx) => {
              if (segment.type === 'text') {
                return <Text key={`text-${idx}`}>{segment.content}</Text>;
              } else {
                console.log('🎨 Rendering component inline:', segment.content.name);
                return renderComponent(segment.content);
              }
            })}
          </Text>
        );
      };
    }

    // Custom code block renderer
    rules.fence = (node: any, _children: any, _parent: any, _styles: any) => {
      const language = node.sourceInfo || '';
      const code = node.content || '';
      const currentTheme = typeof theme === 'string' ? theme : 'dark';
      
      return (
        <CodeBlock
          key={node.key}
          code={code}
          language={language}
          theme={currentTheme}
        />
      );
    };

    return rules;
  }, [processedContent.components, renderComponent, theme]);

  // Prepare markdown with component placeholders
  const markdownWithPlaceholders = useMemo(() => {
    return injectComponentPlaceholders(processedContent.markdown, processedContent.components);
  }, [processedContent]);

  // Handle empty content
  if (!children || children.trim().length === 0) {
    return null;
  }

  console.log('🎯 About to render markdown:', {
    markdownLength: markdownWithPlaceholders.length,
    markdownPreview: markdownWithPlaceholders.substring(0, 500),
    componentsCount: processedContent.components.length
  });

  return (
    <View style={[{ flex: 1 }, style]}>
      <MarkdownRenderer
        style={markdownStyles}
        rules={customRules}
        theme={typeof theme === 'string' ? theme : 'dark'}
      >
        {markdownWithPlaceholders}
      </MarkdownRenderer>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if children or theme changes
  return prevProps.children === nextProps.children && 
         prevProps.theme === nextProps.theme;
});

export default StreamdownRN;
