# streamdown-rn

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
