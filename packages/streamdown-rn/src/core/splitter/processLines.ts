import type { BlockRegistry, IncompleteTagState } from '../types';
import { INITIAL_INCOMPLETE_STATE, updateTagState } from '../incomplete';
import { detectBlockType, detectPartialBlockType } from './blockPatterns';
import { finalizeBlock } from './finalizeBlock';
import { findCodeBlockCloseIndex, findComponentCloseIndex } from './blockClosers';
import { logDebug } from './logger';

interface ProcessArgs {
  registry: BlockRegistry;
  fullText: string;
  lines: string[];
  activeContent: string;
  tagState: IncompleteTagState;
  activeStartPos: number;
}

export function processLines(args: ProcessArgs): BlockRegistry {
  const normalizedArgs = consumeLeadingBlocks(args);
  return (
    handleExplicitClosingBlocks(normalizedArgs) ??
    handleHeadingBlock(normalizedArgs) ??
    handleParagraphBoundary(normalizedArgs) ??
    handleDoubleNewline(normalizedArgs) ??
    handleActiveBlock(normalizedArgs)
  );
}

function handleExplicitClosingBlocks({
  registry,
  fullText,
  activeContent,
  tagState,
}: ProcessArgs): BlockRegistry | null {
  const currentType = registry.activeBlock?.type;
  if (currentType === 'codeBlock') {
    const closeIndex = findCodeBlockCloseIndex(activeContent);
    if (closeIndex !== -1) {
      const blockContent = activeContent.slice(0, closeIndex);
      const remainder = activeContent.slice(closeIndex);
      const block = finalizeBlock(
        blockContent,
        'codeBlock',
        registry.blockCounter,
        registry.activeBlock!.startPos
      );

      const finalized: BlockRegistry = {
        blocks: [...registry.blocks, block],
        activeBlock: null,
        activeTagState: INITIAL_INCOMPLETE_STATE,
        cursor: fullText.length,
        blockCounter: registry.blockCounter + 1,
      };

      const normalizedRemainder = normalizeBlockContent(
        remainder,
        registry.activeBlock!.startPos + closeIndex
      );

      if (!normalizedRemainder.content.trim()) {
        return finalized;
      }

      return processLines({
        registry: finalized,
        fullText,
        lines: normalizedRemainder.content.split('\n'),
        activeContent: normalizedRemainder.content,
        tagState: updateTagState(INITIAL_INCOMPLETE_STATE, normalizedRemainder.content),
        activeStartPos: normalizedRemainder.startPos,
      });
    }

    return updateActiveBlock(registry, activeContent, tagState, fullText);
  }

  if (currentType === 'component') {
    const closeIndex = findComponentCloseIndex(activeContent);
    if (closeIndex !== -1) {
      const blockContent = activeContent.slice(0, closeIndex);
      const remainder = activeContent.slice(closeIndex);
      const block = finalizeBlock(
        blockContent,
        'component',
        registry.blockCounter,
        registry.activeBlock!.startPos
      );

      const finalized: BlockRegistry = {
        blocks: [...registry.blocks, block],
        activeBlock: null,
        activeTagState: INITIAL_INCOMPLETE_STATE,
        cursor: fullText.length,
        blockCounter: registry.blockCounter + 1,
      };

      const normalizedRemainder = normalizeBlockContent(
        remainder,
        registry.activeBlock!.startPos + closeIndex
      );

      if (!normalizedRemainder.content.trim()) {
        return finalized;
      }

      return processLines({
        registry: finalized,
        fullText,
        lines: normalizedRemainder.content.split('\n'),
        activeContent: normalizedRemainder.content,
        tagState: updateTagState(INITIAL_INCOMPLETE_STATE, normalizedRemainder.content),
        activeStartPos: normalizedRemainder.startPos,
      });
    }

    return updateActiveBlock(registry, activeContent, tagState, fullText);
  }

  return null;
}

function handleHeadingBlock({
  registry,
  fullText,
  activeContent,
  tagState,
}: ProcessArgs): BlockRegistry | null {
  if (registry.activeBlock?.type !== 'heading') return null;

  const newlineIndex = activeContent.indexOf('\n');
  if (newlineIndex === -1) return null;

  const headingContent = activeContent.slice(0, newlineIndex).trimEnd();
  const remainder = activeContent.slice(newlineIndex + 1);

  logDebug('finalizing heading block', {
    headingContent,
    remainderPreview: remainder.slice(0, 40),
  });

  const headingBlock = finalizeBlock(
    headingContent,
    'heading',
    registry.blockCounter,
    registry.activeBlock.startPos
  );

  const normalizedRemainder = normalizeBlockContent(
    remainder,
    headingBlock.endPos + 1
  );

  if (!normalizedRemainder.content.trim()) {
    return {
      blocks: [...registry.blocks, headingBlock],
      activeBlock: null,
      activeTagState: INITIAL_INCOMPLETE_STATE,
      cursor: fullText.length,
      blockCounter: registry.blockCounter + 1,
    };
  }

  const detectedNext = detectBlockType(
    normalizedRemainder.content.split('\n')[0]
  );
  return {
    blocks: [...registry.blocks, headingBlock],
    activeBlock: {
      type: detectedNext?.type || 'paragraph',
      content: normalizedRemainder.content,
      startPos: normalizedRemainder.startPos,
    },
    activeTagState: tagState,
    cursor: fullText.length,
    blockCounter: registry.blockCounter + 1,
  };
}

function handleParagraphBoundary({
  registry,
  fullText,
  activeContent,
  tagState,
}: ProcessArgs): BlockRegistry | null {
  if (registry.activeBlock?.type !== 'paragraph') return null;

  const lastNewlineIndex = activeContent.lastIndexOf('\n');
  if (
    lastNewlineIndex === -1 ||
    lastNewlineIndex >= activeContent.length - 1
  ) {
    return null;
  }

  const lastLine = activeContent.slice(lastNewlineIndex + 1);
  const detectedNext = detectBlockType(lastLine);
  if (!detectedNext || detectedNext.type === 'paragraph') return null;

  const paragraphContent = activeContent.slice(0, lastNewlineIndex).trimEnd();
  const normalizedRemainder = normalizeBlockContent(
    activeContent.slice(lastNewlineIndex + 1),
    registry.activeBlock.startPos + lastNewlineIndex + 1
  );

  const blocks = paragraphContent
    ? [
        ...registry.blocks,
        finalizeBlock(
          paragraphContent,
          'paragraph',
          registry.blockCounter,
          registry.activeBlock.startPos
        ),
      ]
    : registry.blocks;

  const blockCounter =
    registry.blockCounter + (paragraphContent ? 1 : 0);

  return {
    blocks,
    activeBlock: {
      type: detectedNext.type,
      content: normalizedRemainder.content,
      startPos: normalizedRemainder.startPos,
    },
    activeTagState: tagState,
    cursor: fullText.length,
    blockCounter,
  };
}

function handleDoubleNewline({
  registry,
  fullText,
  activeContent,
  tagState,
  activeStartPos,
}: ProcessArgs): BlockRegistry | null {
  if (!activeContent.includes('\n\n')) return null;

  const segments = activeContent.split(/\n\n+/);
  const separators = activeContent.match(/\n\n+/g) ?? [];
  let offset = 0;
  let blocks = [...registry.blocks];
  let blockCounter = registry.blockCounter;
  const baseStart =
    registry.activeBlock?.startPos !== undefined
      ? registry.activeBlock.startPos
      : activeStartPos;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i].trimEnd();
    if (!segment) {
      offset += segments[i].length + separators[i].length;
      continue;
    }
    const detected = detectBlockType(segment.split('\n')[0]);
    const type = detected?.type || 'paragraph';
    blocks = [
      ...blocks,
      finalizeBlock(segment, type, blockCounter, baseStart + offset),
    ];
    blockCounter++;
    offset += segments[i].length + separators[i].length;
  }

  const remainder = segments[segments.length - 1];
  const remainderStart = baseStart + offset;
  const normalizedRemainder = normalizeBlockContent(
    remainder,
    remainderStart
  );
  const detected = detectBlockType(
    normalizedRemainder.content.split('\n')[0]
  );

  return {
    blocks,
    activeBlock: normalizedRemainder.content
      ? {
          type: detected?.type || 'paragraph',
          content: normalizedRemainder.content,
          startPos: normalizedRemainder.startPos,
        }
      : null,
    activeTagState: normalizedRemainder.content
      ? tagState
      : INITIAL_INCOMPLETE_STATE,
    cursor: fullText.length,
    blockCounter,
  };
}

function handleActiveBlock({
  registry,
  fullText,
  activeContent,
  tagState,
  activeStartPos,
}: ProcessArgs): BlockRegistry {
  if (!registry.activeBlock) {
    const { normalizedContent, trimmedChars } =
      trimLeadingWhitespace(activeContent);

    if (!normalizedContent) {
      return {
        ...registry,
        activeBlock: null,
        activeTagState: INITIAL_INCOMPLETE_STATE,
        cursor: fullText.length,
      };
    }

    const normalizedLines = normalizedContent.split('\n');
    
    // Use partial detection for immediate type recognition
    const partialDetected = detectPartialBlockType(normalizedContent);
    const completeDetected = detectBlockType(normalizedLines[0]);
    const detected = completeDetected || partialDetected;

    const updatedRegistry = {
      ...registry,
      activeBlock: {
        type: detected?.type || 'paragraph',
        content: normalizedContent,
        startPos: activeStartPos + trimmedChars,
      },
      activeTagState: tagState,
      cursor: fullText.length,
    };
    return processLines({
      registry: updatedRegistry,
      fullText,
      lines: normalizedLines,
      activeContent: normalizedContent,
      tagState,
      activeStartPos: activeStartPos + trimmedChars,
    });
  }

  return updateActiveBlock(registry, activeContent, tagState, fullText);
}

function updateActiveBlock(
  registry: BlockRegistry,
  content: string,
  tagState: IncompleteTagState,
  fullText: string
): BlockRegistry {
  if (!registry.activeBlock) {
    return {
      ...registry,
      activeBlock: null,
      activeTagState: tagState,
      cursor: fullText.length,
    };
  }
  
  // Re-detect type on each update using partial detection
  // This allows type to change as more characters arrive
  // e.g., "#" → heading, "# " → heading (confirmed), "# Hello" → heading
  const partialDetected = detectPartialBlockType(content);
  const firstLine = content.split('\n')[0];
  const completeDetected = detectBlockType(firstLine);
  
  // Prefer complete detection, fall back to partial, then keep current type
  const newType = completeDetected?.type 
    ?? partialDetected?.type 
    ?? registry.activeBlock.type;
  
  return {
    ...registry,
    activeBlock: {
      ...registry.activeBlock,
      content,
      type: newType,
    },
    activeTagState: tagState,
    cursor: fullText.length,
  };
}

function trimLeadingWhitespace(content: string) {
  const match = content.match(/^([\r\n]+)/);
  if (!match) {
    return { normalizedContent: content, trimmedChars: 0 };
  }
  return {
    normalizedContent: content.slice(match[0].length),
    trimmedChars: match[0].length,
  };
}

function normalizeBlockContent(content: string, startPos: number) {
  const { normalizedContent, trimmedChars } = trimLeadingWhitespace(content);
  return {
    content: normalizedContent,
    startPos: startPos + trimmedChars,
  };
}

function consumeLeadingBlocks(args: ProcessArgs): ProcessArgs {
  if (args.registry.activeBlock) {
    return args;
  }

  let content = args.activeContent;
  let startPos = args.activeStartPos;
  let blocks = [...args.registry.blocks];
  let blockCounter = args.registry.blockCounter;

  while (true) {
    const { normalizedContent, trimmedChars } = trimLeadingWhitespace(content);
    content = normalizedContent;
    startPos += trimmedChars;

    if (!content) {
      return {
        ...args,
        registry: { ...args.registry, blocks, blockCounter },
        activeContent: '',
        tagState: INITIAL_INCOMPLETE_STATE,
        lines: [''],
        activeStartPos: startPos,
      };
    }

    const newlineIndex = content.indexOf('\n');
    if (newlineIndex === -1) {
      break;
    }

    const firstLine = content.slice(0, newlineIndex);
    const detected = detectBlockType(firstLine);
    if (!detected || detected.type !== 'heading') {
      break;
    }

    const headingBlock = finalizeBlock(
      firstLine.trimEnd(),
      'heading',
      blockCounter,
      startPos
    );
    blocks = [...blocks, headingBlock];
    blockCounter++;
    content = content.slice(newlineIndex + 1);
    startPos += newlineIndex + 1;
  }

  return {
    ...args,
    registry: { ...args.registry, blocks, blockCounter },
    activeContent: content,
    lines: content.split('\n'),
    tagState: updateTagState(INITIAL_INCOMPLETE_STATE, content),
    activeStartPos: startPos,
  };
}

