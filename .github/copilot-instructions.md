# AI Agent Instructions: Bible Type

## 🎯 Project Overview

**Bible Type** is a vanilla JS meditative typing app: users type the first letter of every word from 1,189 Bible chapters (66 books). Core stack is still pure HTML/CSS/JavaScript, but light dependencies (e.g., Dexie.js for storage) are now allowed so long as the experience remains fast on desktop and mobile browsers.

## 🤝 Communication & Working Style

- Speak in plain, down-to-earth language—assume the product manager is a "vibe coder" overseeing direction while we handle all implementation details.
- Treat the user as the manager: they set priorities, we propose solutions and execute.
- Default to proactive ownership (no passing work back). If something technical is ambiguous, make a reasonable call and note the assumption.
- However, if it's a major design/UX decision, flag it for review first.
- When introducing technical ideas, translate them into simple analogies or visuals first, then add optional deeper detail.

## 🏗️ Architecture: Modular Singleton Pattern

Five independent modules communicate via **listener pattern** (not direct calls):

```
                    USER INPUT
                        ↓
    ┌─────────────────────────────────────────┐
    │ app.js (Controller)                     │ Global keydown listener
    └─────────────────────────────────────────┘ Orchestrates flow
                        ↓
    ┌─────────────────────────────────────────┐
    │ typing-engine.js (Core Logic)           │ Validates keystroke
    │ - parseWords()                          │ Tracks position
    │ - handleKeystroke()                     │ Fires 'word-advanced' event
    │ - endChapter()                          │
    └─────────────────────────────────────────┘
                        ↓
    ┌──────────────────────────────────────────┐
    │ ui-manager.js (View + theme)             │ Listens to engine
    │ - showModal() / hideModal()              │ Updates DOM
    │ - applyTheme()                           │
    └──────────────────────────────────────────┘
                        ↓
    ┌──────────────────────────────────────────┐
    │ storage-manager.js (Persistence)         │ Debounced saves
    │ - Fallback for private browsing          │
    └──────────────────────────────────────────┘
```

**Key**: Each module is a singleton (one instance, global). No module references another's private properties. All cross-module communication uses `subscribe()` listener pattern.

## 🔄 Critical Data Flows

### 1. **First Load Sequence** (app.js → typingEngine → ui)
```javascript
app.init()
  → storageManager.getPosition()  // Saved location or Genesis 1:1
  → typingEngine.loadChapter(bookId, chapterNumber)
    → dataLoader.loadChapter()  // Fetch JSON from data/[book]/[chapter].json
    → typingEngine.parseWords()  // Split verses into words array
    → typingEngine.renderChapterToDOM()  // Create word spans with first-letter marked
  → uiManager.showDashboard()
```

### 2. **Keystroke Flow** (Critical: First letter of each WORD, not character)
```
User presses 'L' key
  ↓
Global keydown listener in app.setupKeyboardListeners()
  ↓
typingEngine.handleKeystroke('L')
  • Gets currentWord = this.words[currentPosition.wordIndex]
  • expectedLetter = currentWord.firstLetter (lowercase)
  • inputLetter = 'L'.toLowerCase()
  ✓ If match: advanceWord() → update DOM + fire 'word-advanced'
  ✗ If mismatch: triggerErrorFeedback() (shake animation)
  ↓
typingEngine.notifyListeners('word-advanced', position)
  ↓
app.handleKeystroke() receives event
  ↓
storageManager.debouncedSave() (saves after 500ms inactivity)
```

**IMPORTANT**: In `typing-engine.js`, first letter detection now **skips punctuation**. Regex `/[a-zA-Z]/` finds first actual letter (not `"`, not punctuation).

## 📦 Module-Specific Patterns

### **typing-engine.js** (Game State)
- `words[]` array: Pre-parsed from verses, contains `{ text, firstLetter, verseIndex, wordIndex }`
- `wordElements[]`: DOM span references (matched 1-to-1 with words)
- Active word tracked by `currentPosition.wordIndex`
- Error detection via CSS class toggle (`error` class triggers shake animation)
- **Event types**: `keystroke`, `word-advanced`, `chapter-completed`, `error`

### **storage-manager.js** (Resilient Persistence)
- **Current state**: Uses `localStorage` with try-catch plus an in-memory fallback for private browsing.
- **Near-term plan**: Migrate to Dexie.js (IndexedDB wrapper) for chapter-by-chapter progress, notes, and richer settings while keeping the same public API.
- **Debouncing**: `createDebouncedProgressSave(500ms)` prevents excessive writes
- **Format**: `bibletype_[key]` prefix for all keys
- **Keys**: `position`, `stats`, `settings`, `chapter_[bookId]_[chapterNumber]`, `first_time` (to be expanded during Dexie migration)

### **data-loader.js** (Smart Loading)
- **Singleton cache**: In-memory, prevents re-fetching same chapter
- **Request dedup**: If chapter already loading, return pending promise
- **Prefetch**: `prefetchNextChapter()` loads ahead in background (fire & forget)
- **Fallback**: If data file 404, generates sample data (Lorem ipsum)
- **Structure**: `data/[book]/[chapter].json` → Array of verse strings

### **ui-manager.js** (Theme + Views)
- **Theming**: CSS `data-theme` attribute on `<html>`. No JS redraws needed.
- **Modals**: 5 types (settings, complete, how-to-play, error, future)
- **Focus trap**: `trapFocus()` method for accessibility (modal only)
- **Font size**: CSS custom property `--font-base` (14–28px slider)

### **app.js** (Orchestrator)
- **Flow**: init() → check first-time → load position → subscribe to engine → show dashboard
- **Debounced save**: Captures on every keystroke, but writes every 500ms
- **Next chapter**: `getNextChapterCoordinates()` handles Bible order (Genesis 1 → 50, then Exodus 1 → 40, etc.)
- **Completion**: Shows "You completed the Bible!" message when all 1,189 chapters done

## 🎨 Styling: CSS Variables Only

All theming via CSS custom properties in `:root` (Light, Dark, Sepia). No JavaScript color logic.
```css
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  --accent-primary: #2563eb;
  /* ... 30+ more properties */
}
```

Change theme: `document.documentElement.setAttribute('data-theme', 'dark')`. Instant switch, no rerender.

## 📊 Data Format

Each chapter is a simple JSON array of verse strings:
```json
[
  "In the beginning God created the heavens and the earth.",
  "Now the earth was formless and empty, darkness was over the surface of the deep."
]
```

Directory: `data/[lowercase-book]/[chapter].json` (66 books, 1,189 chapters total)

## 🚀 Development Quick Reference

| Task | Code Location |
|------|---|
| Add new event type | `typingEngine.notifyListeners('new-event', data)` in typing-engine.js |
| New modal | Add HTML in index.html, handler in `setupModalHandlers()` (ui-manager.js) |
| Fix typing logic | Examine `parseWords()` + `renderChapterToDOM()` + `handleKeystroke()` in typing-engine.js |
| Change colors | Modify `:root` CSS variables in styles.css (one place only) |
| Add book metadata | Update `BOOKS` array in data-loader.js (defines 66 books + chapter counts) |
| Debug persistence | Check storage-manager.js fallback logic + key naming |

## ⚠️ Common Pitfalls

1. **First-letter detection**: Must skip punctuation (regex `/[a-zA-Z]/`). Don't just use `charAt(0)`.
2. **Module coupling**: Never call private methods (`_method`). Use `subscribe()` instead.
3. **localStorage access**: Always wrap in `storageManager` methods, not direct `localStorage` calls.
4. **DOM references**: Store in variables, cache on init. Don't re-query every keystroke.
5. **Debounced saves**: Only save when user stops typing (500ms). Hammer-proof!
