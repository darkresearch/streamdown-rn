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
- **Streaming simulation**: Typewriter effect to test streaming behavior with adjustable speed
- **Step-by-step debugging**: Pause and use ← → arrows to navigate character-by-character
- **State debug panel**: Real-time visualization of markdown tag state and component extraction
- **Component library**: View React source code for all test components
- **Progressive rendering showcase**: See field-by-field rendering in action
- **Preset examples**: Quick access to common markdown patterns
- **Component registry**: Test dynamic component injection with new compact syntax
- **Theme toggle**: Switch between dark and light themes
- **JSON cleanup visualization**: See exactly how incomplete JSON is auto-completed

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

The dashboard includes progressive rendering example components:

- `TokenCard`: Displays token information with 4 progressive fields (sym, name, price, change)
- `Button`: Simple button component with progressive label
- `Badge`: Badge component with progressive text

### New Compact Syntax

Components use the new compact syntax:
```
{{c:"TokenCard",p:{"sym":"BTC","name":"Bitcoin","price":45000,"change":2.5}}}
```

### Progressive Rendering

All test components use the `<Progressive>` framework:
- Fields render one-by-one as data streams in
- Missing fields show animated skeleton placeholders
- Click "Components" button to view source code

### Debug Panel

Click "Debug" to open the enhanced state debug panel showing:
- **Component Extraction**: Empty/Partial/Complete component status
- **JSON Cleanup**: See how incomplete JSON is auto-completed
- **Markdown Tags**: Incomplete tag state and processing boundary
- **Real-time updates**: Updates as you step through character-by-character

### Streaming Controls

- **Start/Pause/Resume**: Control streaming playback
- **← →**: Step character-by-character when paused (web only)
- **Reset**: Reset to full content
- **Delay**: Adjust ms/character (try 100ms to see progressive rendering clearly)

