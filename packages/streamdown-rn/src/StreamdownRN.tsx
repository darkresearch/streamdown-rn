/**
 * StreamdownRN - Streaming Markdown Renderer for React Native
 * 
 * High-performance streaming markdown renderer optimized for AI responses.
 * Uses block-level stability to minimize re-renders during streaming.
 * 
 * Architecture:
 * - Completed blocks are memoized and NEVER re-render
 * - Only the active (currently streaming) block re-renders on new tokens
 * - Block boundaries are detected incrementally
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { View, ViewStyle } from 'react-native';

import type {
  StreamdownRNProps,
  BlockRegistry,
  ThemeConfig,
  DebugSnapshot,
} from './core/types';
import { INITIAL_REGISTRY } from './core/types';
import { processNewContent, finalizeActiveBlock } from './core/splitter';
import { fixIncompleteMarkdown } from './core/incomplete';
import { getTheme } from './themes';
import { StableBlock } from './renderers/StableBlock';
import { ActiveBlock } from './renderers/ActiveBlock';

/**
 * StreamdownRN Component
 * 
 * Main entry point for streaming markdown rendering.
 * 
 * @example
 * ```tsx
 * <StreamdownRN theme="dark">
 *   {streamingMarkdownContent}
 * </StreamdownRN>
 * ```
 */
export const StreamdownRN = React.memo<StreamdownRNProps>(({
  children,
  componentRegistry,
  theme = 'dark',
  style,
  onError,
  onDebug,
  isComplete = false,
}) => {
  // Persistent registry reference — survives across renders
  const registryRef = useRef<BlockRegistry>(INITIAL_REGISTRY);

  // Track content for change detection (important for FlashList recycling!)
  const contentRef = useRef<string>('');

  // Debug tracking refs
  const lastUpdateTimeRef = useRef<number>(performance.now());
  const previousContentRef = useRef<string>('');

  // Resolve theme configuration
  const themeConfig = useMemo<ThemeConfig>(() => {
    return getTheme(theme);
  }, [theme]);

  // Process new content incrementally
  // This is the core optimization: only processes NEW tokens
  const registry = useMemo(() => {
    // Handle empty content
    if (!children || children.trim().length === 0) {
      registryRef.current = INITIAL_REGISTRY;
      contentRef.current = '';
      return INITIAL_REGISTRY;
    }

    try {
      // CRITICAL FIX: Detect if content has completely changed (not just appended)
      // This happens when FlashList recycles a component with new data.
      // If new content doesn't start with the previous content, we must reset.
      const previousContent = contentRef.current;
      const isStreamingContinuation = previousContent.length > 0 &&
        children.startsWith(previousContent);

      if (!isStreamingContinuation && previousContent.length > 0) {
        // Content has changed completely - reset registry
        registryRef.current = INITIAL_REGISTRY;
      }

      // Update content ref
      contentRef.current = children;

      // Process from where we left off (or from beginning if reset)
      let updated = processNewContent(registryRef.current, children);

      // When streaming is complete, finalize the active block
      // This ensures the last block is properly memoized and components
      // transition from skeleton to final state
      if (isComplete && updated.activeBlock) {
        updated = finalizeActiveBlock(updated);
      }

      registryRef.current = updated;
      return updated;
    } catch (error) {
      // Report error but don't crash
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return registryRef.current;
    }
  }, [children, onError, isComplete]);
  
  // Emit debug snapshot when content changes (effect to avoid render-time side effects)
  useEffect(() => {
    if (!onDebug || !children) return;
    
    const now = performance.now();
    const deltaMs = now - lastUpdateTimeRef.current;
    const previousContent = previousContentRef.current;
    const newChars = children.slice(previousContent.length);
    
    // Build debug snapshot
    const snapshot: DebugSnapshot = {
      position: registry.cursor,
      totalLength: children.length,
      newChars,
      newCharsCount: newChars.length,
      registry: {
        stableBlockCount: registry.blocks.length,
        stableBlocks: registry.blocks.map(block => ({
          id: block.id,
          type: block.type,
          contentLength: block.content.length,
          content: block.content,
        })),
        activeBlock: registry.activeBlock ? {
          type: registry.activeBlock.type,
          contentLength: registry.activeBlock.content.length,
          content: registry.activeBlock.content,
        } : null,
        tagState: { ...registry.activeTagState },
      },
      fixedContent: registry.activeBlock 
        ? fixIncompleteMarkdown(registry.activeBlock.content, registry.activeTagState)
        : null,
      timestamp: now,
      deltaMs,
    };
    
    // Emit snapshot
    onDebug(snapshot);
    
    // Update refs for next iteration
    lastUpdateTimeRef.current = now;
    previousContentRef.current = children;
  }, [children, onDebug, registry]);
  
  // Handle empty content
  if (!children || children.trim().length === 0) {
    return null;
  }
  
  // Container style
  const containerStyle: ViewStyle = {
    flex: 1,
    ...(style as ViewStyle),
  };
  
  return (
    <View style={containerStyle}>
      {/* Stable blocks — memoized, never re-render */}
      {registry.blocks.map(block => (
        <StableBlock
          key={block.id}
          block={block}
          theme={themeConfig}
          componentRegistry={componentRegistry}
        />
      ))}
      
      {/* Active block — re-renders on each token */}
      <ActiveBlock
        block={registry.activeBlock}
        tagState={registry.activeTagState}
        theme={themeConfig}
        componentRegistry={componentRegistry}
      />
    </View>
  );
}, (prev, next) => {
  // Custom comparison for memo
  // Re-render if content, theme, or isComplete changes
  return (
    prev.children === next.children &&
    prev.theme === next.theme &&
    prev.isComplete === next.isComplete
  );
});

StreamdownRN.displayName = 'StreamdownRN';

export default StreamdownRN;
