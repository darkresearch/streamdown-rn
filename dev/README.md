# StreamdownRN Dev Dashboard

A minimal Expo-based admin dashboard for visually testing and developing streamdown-rn.

## Setup

1. Navigate to the dev directory:
   ```bash
   cd dev
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start Expo:
   ```bash
   bun run start
   ```

   Or use Expo CLI directly:
   ```bash
   npx expo start
   ```

## Features

- **Direct source imports**: Imports `streamdown-rn` directly from `../src` via module resolution (no dependency needed)
- **Streaming simulation**: Typewriter effect to test streaming behavior
- **Preset examples**: Quick access to common markdown patterns
- **Component registry**: Test dynamic component injection
- **Theme toggle**: Switch between dark and light themes
- **Dark branding**: Matches Dark website colorway (#020202 background, #D7D7D7 text)

## How It Works

The dev app uses module resolution to import `streamdown-rn` directly from source:

- **TypeScript**: Path alias in `tsconfig.json` maps `streamdown-rn` to `../src`
- **Metro**: `metro.config.js` uses `extraNodeModules` to resolve `streamdown-rn` to `../src`

This means:
- No build step needed for testing
- Changes to `../src` files reflect immediately
- No recursive install issues (streamdown-rn is not a dependency)

## Usage

1. Select a preset or type markdown in the input area
2. Click "Start Streaming" to simulate streaming behavior
3. Adjust the speed (ms per character) to control streaming rate
4. Toggle between dark/light themes
5. Watch the rendered output update in real-time

## Testing Components

The dashboard includes example components for testing component injection:

- `TokenCard`: Displays token information
- `Button`: Simple button component
- `Badge`: Badge component

Use the `withComponents` preset to see component injection in action.

