# Bible Type - Meditative Typing App

A beautiful, minimalist web application for meditative typing practice using Bible scripture. Type the first letter of every word to progress through the Bible at your own pace.

## 🎯 Features

- **Meditative Experience**: Focus on the present moment as you type the first letter of each word
- **Complete Bible**: All 1,189 chapters across 66 books (Old and New Testament)
- **Multiple Bible Versions**: Support for ESV, KJV, NIV, and more with independent progress tracking
- **Multiple Themes**: Light, Dark, and Sepia themes for comfortable reading
- **Responsive Design**: Perfectly optimized for desktop, tablet, and mobile
- **Progress Tracking**: Persistent storage of your reading progress and statistics (per version)
- **Keyboard-Friendly**: All features accessible via keyboard navigation
- **Performance-Optimized**: Lightweight, vanilla JavaScript - no frameworks
- **Accessibility**: Full keyboard navigation and screen reader support
- **Offline-Ready**: Fully client-side, works without internet (after first load)

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- (Optional) A static HTTP server for local development

### Installation

1. Clone or download this repository:
```bash
git clone <repository-url>
cd ScriptTypeApp
```

2. Populate Bible data (see below)

3. Serve the files locally:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx http-server

# Using Live Server (VS Code extension)
# Install: esbenp.prettier-vscode
# Right-click index.html -> Open with Live Server
```

4. Open your browser to `http://localhost:8000`

## 📖 Setting Up Bible Data

The app supports **multiple Bible versions** with independent progress tracking. Each version is stored in its own folder.

### Quick Start: Using the Processing Script

**Recommended Method**: Use the included Python script to process Bible JSON files:

```bash
# Process a Bible JSON file (ESV example)
python scripts/process_bible_json.py "path/to/ESV_bible.json" data/esv --version ESV

# Add more versions
python scripts/process_bible_json.py "path/to/KJV_bible.json" data/kjv --version KJV
python scripts/process_bible_json.py "path/to/NIV_bible.json" data/niv --version NIV
```

**See [MULTI_VERSION_QUICKSTART.md](MULTI_VERSION_QUICKSTART.md) for detailed instructions.**

### Directory Structure (Multi-Version)
```
data/
├── esv/                    # ESV Bible
│   ├── version.json        # Version metadata
│   ├── genesis/
│   │   ├── 1.json
│   │   ├── 2.json
│   │   └── ...
│   ├── exodus/
│   └── ...
├── kjv/                    # KJV Bible
│   ├── version.json
│   ├── genesis/
│   └── ...
└── niv/                    # NIV Bible
    └── ...
```

### JSON Format
Each chapter file contains an array of strings (verses):

```json
[
    "In the beginning God created the heavens and the earth.",
    "Now the earth was formless and empty, darkness was over the surface of the deep.",
    "And God said, \"Let there be light,\" and there was light."
]
```

### Where to Get Bible Data

**Note**: Bible text data is NOT included in this repository due to copyright.

**Options**:
1. **Bible APIs**: [api.scripture.api.bible](https://scripture.api.bible/) (free API key required)
2. **Open Source**: Search GitHub for "bible json" repositories
3. **Public Domain**: KJV is freely available
4. **Licensed Versions**: ESV, NIV, NLT require publisher permission

**See [scripts/README_BIBLE_PROCESSING.md](scripts/README_BIBLE_PROCESSING.md) for more details.**

### Legacy Format (Backward Compatible)

The old single-version format still works:
```
data/
├── genesis/
│   ├── 1.json
│   └── ...
```

But multi-version format is recommended for new installations.

2. Use the provided script to generate data files:
```bash
python3 scripts/generate_data.py <input_bible.json> ./data
```

## 🎮 How to Play

1. **Start**: Click "Continue Typing" or select a book from the dashboard
2. **Type**: For each word, type its **first letter**
   - Example: "In the beginning" → Type: `I` `t` `b`
3. **Stay Focused**: Corrections happen automatically; errors provide subtle visual feedback
4. **Progress**: Your position and statistics are saved automatically
5. **Complete**: Finish a chapter and celebrate your achievement

## ⌨️ Keyboard Controls

| Key | Action |
|-----|--------|
| **Letter keys** | Type the first letter of each word |
| **ESC** | Return to dashboard |
| **Tab** | Navigate UI elements |
| **Enter/Space** | Activate buttons and links |

## ⚙️ Settings

Access settings by clicking the gear icon in the dashboard:

- **Theme**: Choose between Light, Dark, and Sepia
- **Font Size**: Adjust text size (14px - 28px)
- **Jump to Chapter**: Select any book and chapter to start reading
- **Reset Progress**: Clear all saved progress (use with caution!)

## 📱 Mobile Features

- Responsive layout that adapts to small screens
- Automatic handling of on-screen keyboard appearance
- Touch-friendly buttons and controls
- Optimized text sizing for readability

## 🎨 Design Philosophy

**"Notion for Typing"** - The app emphasizes content over chrome. UI elements are subtle, text is the hero, and the experience is meditative and motivating.

### Font Choices

- **UI (Inter)**: A clean, modern sans-serif font chosen for its exceptional legibility, consistency across all sizes, and professional appearance. Perfect for buttons, labels, and navigation.

- **Content (Merriweather)**: An elegant serif font chosen for its warm, traditional feel that complements religious text. Its generous spacing and serif details make it exceptionally readable in long passages, reducing eye strain during extended reading sessions.

### Color Themes

- **Light**: Clean white background with dark text, subtle borders. Ideal for daytime use.
- **Dark**: Beautiful low-contrast dark mode with carefully chosen grays. Perfect for evening reading.
- **Sepia**: Warm, paper-like theme inspired by old manuscripts and printed Bibles.

## 💾 Data Persistence

The app uses localStorage to save:

- **Current Position**: Your exact location (book, chapter, verse, word)
- **Statistics**: Total words typed, current streak, average WPM, sessions completed
- **Settings**: Theme preference and font size
- **Progress**: Which chapters you've completed

All data is stored locally in your browser. No data is sent to any server.

### Private Browsing

If localStorage is unavailable (private browsing mode), the app gracefully falls back to in-memory storage for the current session.

## 🔧 Architecture

The application is organized into modular components:

- **`index.html`**: Single-page template with all views and modals
- **`css/styles.css`**: Comprehensive styling with CSS custom properties for theming
- **`js/data-loader.js`**: Bible chapter data loading, caching, and multi-version management
- **`js/storage-manager.js`**: localStorage abstraction and version-specific persistence
- **`js/typing-engine.js`**: Core typing game logic and state management
- **`js/ui-manager.js`**: UI interactions, view management, and version switching
- **`js/app.js`**: Main orchestrator and controller

**Multi-Version Architecture**: Each Bible version (ESV, KJV, NIV) has:
- Separate data folder: `data/<version>/`
- Independent progress tracking in localStorage
- Automatic discovery on app initialization
- See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for technical details

## 🚀 Performance Optimizations

- **Lazy Loading**: Chapters only load when needed
- **Prefetching**: Next chapter is prefetched in the background
- **Debounced Saves**: Progress saves are debounced to prevent excessive writes
- **No Frameworks**: Vanilla JavaScript for minimal overhead
- **CSS Variables**: Efficient theme switching without reloading
- **Responsive Images**: Optimized for all device sizes

## ♿ Accessibility

- **Keyboard Navigation**: All features accessible via keyboard
- **Focus Management**: Proper focus trapping in modals
- **ARIA Attributes**: Dynamic content properly announced to screen readers
- **Color Contrast**: Meets WCAG AA standards across all themes
- **Semantic HTML**: Proper heading hierarchy and landmark regions
- **Motion Preferences**: Respects `prefers-reduced-motion` setting

## 🐛 Troubleshooting

### "Failed to load chapter" error
- Ensure Bible data files are in the correct directory structure
- **Multi-version**: `data/<version>/<book>/<number>.json` (e.g., `data/esv/genesis/1.json`)
- **Legacy**: `data/<book>/<number>.json`
- Check browser console for specific error messages
- Verify JSON files are valid JSON

### "Version not available" error
- Make sure you've processed the Bible data: `python scripts/process_bible_json.py input.json data/<version> --version <VERSION>`
- Verify `data/<version>/version.json` exists
- Check browser console for details

### Settings not persisting
- Check if localStorage is disabled (private browsing mode)
- Try clearing browser cache and reloading
- Check browser console for storage errors

### Mobile keyboard not working
- Ensure the input field is focused (tap on "Start typing" area)
- Try landscape orientation for better typing experience
- Disable autocorrect/autocomplete if it's interfering

## 📄 License

This project is provided as-is for personal and educational use.

## 🙏 Acknowledgments

- Bible text source: [Add your source here]
- Font families: Inter (Rasmus Andersson) and Merriweather (Eben Sorkin)
- Inspired by meditative and mindfulness apps

## 📞 Support

For issues, suggestions, or feedback, please open an issue on the repository.

---

**Made with ❤️ for meditative practice and spiritual reflection.**
