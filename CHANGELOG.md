# streamdown-rn

## 0.1.6

### Patch Changes

- Enhanced fuzz testing, fixed component injection bugs, and improved CI configuration.

## 0.1.6 (Unreleased)

### Major Changes

- **Progressive field rendering**: Components now render field-by-field as data streams in, dramatically improving perceived performance (75%+ faster time-to-first-render)
- **New compact syntax**: Changed from `{{component: "Name", props: {...}}}` to `{{c:"Name",p:{...}}}` for ~50% character reduction
- **Declarative Progressive framework**: New `<Progressive>` and `<Progressive.Field>` components for building components with field-level skeleton states
- **Intelligent JSON parsing**: Auto-completes incomplete JSON during streaming (handles trailing commas, incomplete field names, partial numbers, etc.)
- **Field-level skeletons**: `<FieldSkeleton>` component for granular loading states

### New Features

- Added `ComponentRenderingMetadata` interface with `fieldOrder` for progressive rendering
- Added `extractPartialComponents()` function to extract components with incomplete props
- Added `getLastJSONCleanup()` function for debugging JSON completion logic
- Added `onComponentExtractionUpdate` callback for real-time component extraction state
- Added skeleton colors to theme config: `skeletonBase`, `skeletonHighlight`
- Enhanced dev platform debug panel with component extraction visualization and JSON cleanup steps
- Added component library viewer to dev platform to browse component source code

### Breaking Changes

- **Component syntax change**: Old syntax `{{component: "Name", props: {...}}}` is no longer supported. Use `{{c:"Name",p:{...}}}` instead
- **Prop names**: Components should use short prop names (e.g., `sym` not `tokenSymbol`) for better streaming performance
- **ComponentDefinition**: Added optional `renderingMetadata` field
- **ThemeConfig**: Added required `skeletonBase` and `skeletonHighlight` color fields

### Performance Improvements

- Progressive rendering reduces perceived latency by 75%+ (first visual feedback in ~160ms vs ~650ms)
- Compact syntax reduces token count by ~50%, improving LLM generation speed
- Position offset tracking in partial component extraction prevents regex backtracking issues

### Developer Experience

- Enhanced debug panel with full-text scrollable views
- Component library modal for viewing component source code
- JSON cleanup visualization with step-by-step transformation details
- Better console logging for debugging component extraction

## 0.1.5

### Patch Changes

- Fixed component parsing to gracefully handle extra closing braces. AI models sometimes generate malformed component syntax (like `}}}` instead of `}}`), which previously caused rendering errors. The parser now automatically corrects these cases.

## 0.1.4

### Patch Changes

- Added component buffering during streaming. When markdown streams include dynamic components, partial component syntax (like `{{component:` without closing `}}`) is now hidden until the component is complete. This prevents users from seeing raw component code while streaming.
- Moved from beta to stable release.

## 0.1.3

### Patch Changes

- Improved table rendering with horizontal scrolling. Tables now scroll horizontally instead of awkwardly wrapping text, providing a cleaner viewing experience.
- Enhanced text wrapping for better readability. Long strings (like Solana addresses) in inline code now break properly.
- Added responsive design improvements. Tables and text scale appropriately on mobile devices with optimized font sizes.
- Redesigned table styling to match modern chat interfaces with minimal borders and clean appearance.

## 0.1.2

### Patch Changes

- Code cleanup and maintenance. Removed outdated references, fixed TypeScript warnings, and improved documentation for better developer experience.

## 0.1.1

### Patch Changes

- Set up automated publishing pipeline with GitHub Actions and Changesets for streamlined version management and releases.

## 0.1.0

### Patch Changes

- Initial release: React Native streaming markdown renderer with dynamic component injection. Stream markdown content in real-time while injecting custom React Native components seamlessly.
