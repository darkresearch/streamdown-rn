# StreamdownRN

A React Native streaming markdown renderer inspired by [Vercel's Streamdown](https://github.com/vercel/streamdown), designed specifically for AI chat applications with dynamic component injection.

## Features

🚀 **Streaming-first** - Handles incomplete markdown gracefully during AI response streaming  
🔌 **Component registry** - Dynamic component injection via pluggable registry system  
📱 **Mobile-optimized** - Built specifically for React Native performance  
🎨 **Themeable** - Built-in dark/light theme support  
🎯 **Syntax highlighting** - Beautiful code blocks with copy-to-clipboard  

## Why StreamdownRN?

Traditional markdown renderers break when you stream incomplete content from AI models. StreamdownRN is built specifically for this use case, handling partial formatting gracefully and providing smooth real-time rendering.

Inspired by [Vercel's Streamdown](https://github.com/vercel/streamdown) for React web, StreamdownRN brings the same streaming-first philosophy to React Native with mobile-optimized performance.

## Installation

```bash
bun add streamdown-rn
```

Or with npm/yarn:
```bash
npm install streamdown-rn
# or
yarn add streamdown-rn
```

## Usage

### Basic Usage

```typescript
import { StreamdownRN } from 'streamdown-rn';

const MyComponent = ({ content }) => (
  <StreamdownRN theme="dark">
    {content}
  </StreamdownRN>
);
```

### With Component Registry

```typescript
import { StreamdownRN } from 'streamdown-rn';

const AssistantMessage = ({ content, componentRegistry }) => (
  <View style={styles.assistantRow}>
    <DarkStarIcon />
    <StreamdownRN 
      componentRegistry={componentRegistry}
      theme="dark"
      onComponentError={(error) => console.warn('Component error:', error)}
    >
      {content}
    </StreamdownRN>
  </View>
);
```

### Component Injection

StreamdownRN supports dynamic component injection using JSON syntax:

```markdown
Here's some **bold text** and a dynamic component:

{{component: "TokenCard", props: {
  "tokenSymbol": "BTC",
  "tokenPrice": 45000,
  "priceChange24h": 2.5
}}}

More markdown content continues...
```

## API Reference

### StreamdownRN Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `string` | - | The streaming markdown content |
| `componentRegistry` | `ComponentRegistry` | `undefined` | Optional component registry for dynamic components |
| `theme` | `'light' \| 'dark' \| ThemeConfig` | `'dark'` | Theme configuration |
| `onComponentError` | `(error: ComponentError) => void` | `undefined` | Error handler for component failures |
| `style` | `ViewStyle` | `undefined` | Additional styling for the container |

### Component Registry Interface

```typescript
interface ComponentRegistry {
  get(name: string): ComponentDefinition | undefined;
  validate(name: string, props: any): ValidationResult;
  has(name: string): boolean;
}
```

## Streaming Features

### Incomplete Markdown Handling

StreamdownRN automatically fixes common incomplete markdown patterns:

- **Unclosed bold**: `**bold text` → `**bold text**`
- **Unclosed italic**: `*italic text` → `*italic text*`
- **Unclosed code**: `` `code text`` → `` `code text` ``
- **Unclosed code blocks**: ````javascript\ncode``` → ````javascript\ncode\n````
- **Incomplete lists**: Proper spacing and formatting
- **Incomplete headings**: Proper spacing and formatting

### Performance Optimization

- **Memoized processing** - Prevents unnecessary re-renders
- **Streaming optimization** - Efficient handling of rapid text updates
- **Component caching** - Reuses validated components
- **Memory management** - Optimized for long chat sessions

## Examples

### Basic Markdown

```typescript
const content = `
# Hello World

This is **bold text** and *italic text*.

Here's some \`inline code\` and a list:

- Item 1
- Item 2
- Item 3
`;

<StreamdownRN>{content}</StreamdownRN>
```

### With Dynamic Components

```typescript
const content = `
# Token Analysis

Here's the current Bitcoin data:

{{component: "TokenCard", props: {
  "tokenSymbol": "BTC",
  "tokenName": "Bitcoin",
  "tokenPrice": 45000,
  "priceChange24h": 2.5,
  "volume24h": 1200000000,
  "marketCap": 850000000000
}}}

The price has been **trending upward** recently.
`;

<StreamdownRN componentRegistry={myRegistry}>
  {content}
</StreamdownRN>
```

### Code Syntax Highlighting
```typescript
const codeContent = `
# Smart Contract Example

Here's a simple Solidity contract:

\`\`\`solidity
pragma solidity ^0.8.0;

contract SimpleToken {
    mapping(address => uint256) public balances;
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
\`\`\`
`;

<StreamdownRN>{codeContent}</StreamdownRN>
```

## Roadmap

Features planned for future releases:

- [ ] **Math equations** - LaTeX rendering with KaTeX or react-native-math-view
- [ ] **Mermaid diagrams** - Interactive flowcharts, sequence diagrams, and more
- [ ] **GitHub Flavored Markdown** - Tables, task lists, strikethrough
- [ ] **Custom markdown rules** - Plugin system for extending functionality
- [ ] **Accessibility** - Screen reader support and ARIA labels

## Development

### Building

```bash
bun run build
```

### Testing

```bash
bun test
```

### Type Checking

```bash
bun run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT - see LICENSE file for details

## Inspiration

This project is inspired by [Vercel's Streamdown](https://github.com/vercel/streamdown) but built specifically for React Native environments with mobile-first optimizations.