---
"streamdown-rn": patch
---

Fix React Native Invariant Violation error in CodeBlock component. Explicitly set PreTag and CodeTag to ScrollView to prevent fallback to HTML 'code'/'pre' tags when defaultProps aren't applied. Resolves: "View config getter callback for component `code` must be a function (received `undefined`)"
