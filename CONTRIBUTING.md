# Contributing to streamdown-rn

Thank you for your interest in contributing to streamdown-rn! This document provides guidelines for contributors.

## Development Setup

### For External Contributors

1. **Fork the repository** on GitHub:
   
```bash
git clone https://github.com/YOUR-USERNAME/streamdown-rn.git
cd streamdown-rn
```

2. **Install dependencies**:
```bash
bun install
```

3. **Build the package:**
```bash
bun run build
```

5. **Run type checks:**
```bash
bun run type-check
```

### Testing

While formal tests are being added, please manually test your changes by:

1. Building the package: `bun run build`
2. Using `bun link` to test in a React Native project
3. Verifying markdown rendering works correctly
4. Testing with streaming content (incomplete markdown)
5. Testing dynamic component injection if applicable

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose

## Pull Request Guidelines

1. **One feature per PR** - Keep changes focused
2. **Descriptive title** - Clearly state what the PR does
3. **Description** - Explain the why and how of your changes
4. **Update README** - If adding features, document them
5. **Check types** - Ensure `bun run type-check` passes

## Reporting Issues

When reporting bugs, please include:

- **React Native version**
- **streamdown-rn version**  
- **Platform** (iOS/Android/Web)
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Code sample** (if possible)

## Feature Requests

We welcome feature requests! Please:

- Check if it's already been requested
- Explain the use case clearly
- Provide examples if possible
- Consider if it fits the core mission (streaming markdown for AI chat)

## Questions?

We operate primarily on Github, so the best way to ask a question or start a discussion is to open a Github issue.

## License

By contributing to streamdown-rn, you agree that your contributions will be licensed under the Apache License 2.0.
