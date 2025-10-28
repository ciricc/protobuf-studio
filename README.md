# Protobuf Studio

A web-based tool for converting protobuf messages between formats. Edit messages as JSON and convert them to Binary, Base64, Hex, ProtoText with real-time validation.

<img src="img/preview.png"/>

## Features

- **Multi-format Conversion** - Convert JSON to Binary, Base64, Hex, ProtoText, or JSON
- **Monaco Editor** - Syntax highlighting, autocomplete, and real-time validation
- **File Navigation** - Tree view with fuzzy search for messages and types
- **Import Resolution** - Handle multi-file proto projects with dependencies
- **Auto-persistence** - Saves your work to IndexedDB automatically
- **Dark Mode** - Full theme support with Gruvbox Dark theme
- **100% Local** - All processing happens in the browser, no server needed

## Tech Stack

- React 19 + TypeScript + Vite
- Monaco Editor for code editing
- protobufjs for proto parsing and encoding
- Tailwind CSS for styling
- IndexedDB for persistence

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Upload your `.proto` files using the uploader
2. Select a message type from the file tree
3. Edit the JSON representation in the editor
4. Choose your desired output format
5. Click "Convert" to see the result
6. Copy or download the converted data

## How It Works

The app uses protobufjs to parse `.proto` files in the browser, extracts message schemas, and provides autocomplete for JSON editing. When you convert, it validates and encodes your JSON according to the protobuf schema, then outputs in your chosen format.
