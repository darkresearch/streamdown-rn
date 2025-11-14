/**
 * StreamdownRN - React Native Streaming Markdown Renderer
 * 
 * A streaming-first markdown renderer with dynamic component injection,
 * inspired by Vercel's Streamdown but built specifically for React Native.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { View, Text } from 'react-native';

import { StreamdownRNProps, ThemeConfig, ComponentInstance, INITIAL_INCOMPLETE_STATE } from './core/types';
import { optimizeForStreaming, updateIncompleteTagState } from './core/parseIncomplete';
import { extractComponents, injectComponentPlaceholders } from './core/componentInjector';
import { darkTheme, darkMarkdownStyles } from './themes/dark';
import { lightTheme, lightMarkdownStyles } from './themes/light';
import { MarkdownRenderer } from './renderers/MarkdownRenderer';
import { CodeBlock } from './renderers/CodeBlock';
import { TableWrapper } from './renderers/TableWrapper';

/**
 * Get theme configuration with optional style overrides
 */
function getTheme(
  theme: StreamdownRNProps['theme'],
  styleOverrides?: Partial<Record<string, any>>
): {
  config: ThemeConfig;
  markdownStyles: any;
} {
  let baseConfig: ThemeConfig;
  let baseMarkdownStyles: any;
  
  if (typeof theme === 'object') {
    // Custom theme object - use light styles as base (more neutral)
    baseConfig = theme;
    baseMarkdownStyles = lightMarkdownStyles;
  } else if (theme === 'light') {
    baseConfig = lightTheme;
    baseMarkdownStyles = lightMarkdownStyles;
  } else {
    baseConfig = darkTheme;
    baseMarkdownStyles = darkMarkdownStyles;
  }
  
  // Deep merge style overrides
  const mergedStyles = styleOverrides
    ? { ...baseMarkdownStyles, ...styleOverrides }
    : baseMarkdownStyles;
  
  return {
    config: baseConfig,
    markdownStyles: mergedStyles,
  };
}

/**
 * StreamdownRN Component
 */
export const StreamdownRN: React.FC<StreamdownRNProps> = React.memo(({
  children,
  componentRegistry,
  theme = 'dark',
  styleOverrides,
  onComponentError,
  style,
  onStateUpdate,
}) => {
  // Maintain incomplete tag state for performance optimization
  const incompleteTagStateRef = useRef(INITIAL_INCOMPLETE_STATE);
  
  console.log('🚀 StreamdownRN called with:', {
    textLength: children?.length || 0,
    textPreview: children?.substring(0, 200),
    hasRegistry: !!componentRegistry,
    theme,
    stateStackSize: incompleteTagStateRef.current.stack.length,
    earliestPosition: incompleteTagStateRef.current.earliestPosition,
  });

  // Process markdown with streaming optimizations
  const processedContent = useMemo(() => {
    if (!children || children.length === 0) {
      // Reset state when content is empty
      incompleteTagStateRef.current = INITIAL_INCOMPLETE_STATE;
      return { markdown: '', components: [] };
    }

    console.log('🔄 Processing markdown content...');
    
    // Update incomplete tag state incrementally
    const newState = updateIncompleteTagState(incompleteTagStateRef.current, children);
    incompleteTagStateRef.current = newState;
    
    // Notify state update callback (for debugging)
    if (onStateUpdate) {
      onStateUpdate(newState);
    }
    
    console.log('📊 Incomplete tag state:', {
      stackSize: newState.stack.length,
      earliestPosition: newState.earliestPosition,
      tagCounts: newState.tagCounts,
      processingFromPosition: newState.earliestPosition,
    });

    // Fix incomplete markdown for streaming (pass state for optimization)
    const optimizedMarkdown = optimizeForStreaming(children, newState);
    
    console.log('✅ Optimized markdown:', optimizedMarkdown.substring(0, 300));
    
    // Extract and process components
    const result = extractComponents(optimizedMarkdown, componentRegistry, onComponentError);
    
    console.log('📊 Extraction result:', {
      componentsFound: result.components.length,
      componentNames: result.components.map(c => c.name)
    });
    
    return result;
  }, [children, componentRegistry, onComponentError]);

  // Get theme configuration with style overrides
  const { config: themeConfig, markdownStyles } = useMemo(() => {
    return getTheme(theme, styleOverrides);
  }, [theme, styleOverrides]);

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
        <Text key={id} style={{ color: themeConfig.colors.link, fontSize: 14 }}>
          ⚠️ Error: {name}
        </Text>
      );
    }
  }, [onComponentError, themeConfig]);

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
      
      return (
        <CodeBlock
          key={node.key}
          code={code}
          language={language}
          theme={themeConfig}
        />
      );
    };

    // Custom table renderer with horizontal scroll
    rules.table = (node: any, children: any, _parent: any, styles: any) => {
      const TableComponent = (
        <View key={node.key} style={styles.table}>
          {children}
        </View>
      );
      
      return <TableWrapper key={`wrapper-${node.key}`}>{TableComponent}</TableWrapper>;
    };

    return rules;
  }, [processedContent.components, renderComponent, themeConfig]);

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
  // Only re-render if children, theme, or styleOverrides change
  return prevProps.children === nextProps.children && 
         prevProps.theme === nextProps.theme &&
         prevProps.styleOverrides === nextProps.styleOverrides;
});

export default StreamdownRN;
