# Bible Type - Developer Guide

A comprehensive guide to the architecture, design decisions, and development practices in the Bible Type app.

## 🏗️ Architecture Overview

The application uses a **modular, single-page architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                    UI LAYER                         │
│  index.html (View Templates) + CSS (Styling)       │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│              APPLICATION LAYER                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  app.js      │  │ ui-manager   │  Orchestrators │
│  │  (Controller)│  │ (View Mgmt)  │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│               BUSINESS LOGIC LAYER                  │
│  ┌──────────────┐  ┌──────────────┐                │
│  │typing-engine │  │data-loader   │  Domain Logic │
│  │(Game State)  │  │(Bible Data)  │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│              PERSISTENCE LAYER                      │
│  storage-manager (localStorage Management)         │
└─────────────────────────────────────────────────────┘
```

## 📦 Module Breakdown

### 1. **data-loader.js** - Bible Data Management
**Responsibility**: Load, cache, and manage Bible chapter data

**Key Classes/Objects**:
- `DataLoader` class with singleton instance `dataLoader`

**Key Methods**:
- `loadChapter(bookId, chapterNumber)` - Async load chapter with caching
- `getBook(bookId)` - Get book metadata
- `getAllBooks()` - Get all 66 books
- `prefetchNextChapter(bookId, chapterNumber)` - Performance optimization

**Design Patterns**:
- **Singleton**: Single instance for entire app
- **Caching**: In-memory cache to avoid repeated network requests
- **Lazy Loading**: Only fetch chapters when needed
- **Request Deduplication**: Pending requests returned instead of re-fetching

**Sample Data Format**:
```javascript
// Returns: Array of verse strings
["In the beginning...", "Now the earth was..."]
```

### 2. **storage-manager.js** - Persistence Layer
**Responsibility**: Abstract localStorage access with fallbacks for private browsing

**Key Classes/Objects**:
- `StorageManager` class with singleton instance `storageManager`

**Key Methods**:
- `savePosition()` / `getPosition()` - User's reading location
- `saveStats()` / `getStats()` - WPM, streaks, word counts
- `saveSettings()` / `getSettings()` - Theme, font size
- `saveChapterProgress()` / `isChapterCompleted()` - Progress tracking
- `createDebouncedProgressSave()` - Debounced save function

**Storage Structure**:
```javascript
// localStorage keys (prefixed with 'bibletype_')
{
    'bibletype_position': { bookId, chapterNumber, verseIndex, wordIndex },
    'bibletype_stats': { totalWordsTyped, currentStreak, averageWPM, ... },
    'bibletype_settings': { theme, fontSize },
    'bibletype_chapter_1_1': { bookId, chapterNumber, completed, ... },
}
```

**Fallback**: If localStorage unavailable, uses in-memory fallbackData object

### 3. **typing-engine.js** - Core Game Logic
**Responsibility**: Handle typing mechanics, word parsing, progress tracking

**Key Classes/Objects**:
- `TypingEngine` class with singleton instance `typingEngine`

**Key Methods**:
- `loadChapter()` - Initialize chapter for typing
- `handleKeystroke(key)` - Process user input
- `advanceWord()` - Move to next word
- `triggerErrorFeedback()` - Shake animation on wrong key
- `endChapter()` - Complete chapter session
- `renderChapterToDOM()` - Draw text with interactive spans
- `subscribe()` / `notifyListeners()` - Event system

**Event Types**:
- `keystroke` - User pressed a key
- `word-advanced` - Progressed to next word
- `chapter-completed` - Finished chapter
- `error` - Error occurred

**State Management**:
```javascript
{
    currentPosition: { bookId, chapterNumber, verseIndex, wordIndex },
    verses: [],      // Array of verse strings
    words: [],       // Parsed words with metadata
    wordElements: [], // DOM references
    typingStats: {
        startTime,
        totalWordsTyped,
        correctKeystrokes,
        currentSessionWPM
    }
}
```

**Word Object Structure**:
```javascript
{
    text: "God",
    firstLetter: "g",
    verseIndex: 0,
    wordIndex: 5,
    verse: "In the beginning God created..."
}
```

### 4. **ui-manager.js** - UI & View Management
**Responsibility**: Handle all UI interactions, modal management, theme switching

**Key Classes/Objects**:
- `UIManager` class with singleton instance `uiManager`

**Key Methods**:
- `showModal()` / `hideModal()` - Modal visibility
- `showDashboard()` / `showTypingView()` - View switching
- `applyTheme()` / `applyFontSize()` - Settings application
- `trapFocus()` - Accessibility focus management
- `updateDashboard()` / `updateBooksGrid()` - Refresh UI
- `showError()` / `showChapterComplete()` - Status messages

**Theme Implementation**:
- CSS custom properties (variables) for all colors/spacing
- `data-theme` attribute on `<html>` element
- Themes: "light", "dark", "sepia"

**Modal System**:
- Modal backdrops for focus management
- Keyboard escape to close
- Backdrop click handling

### 5. **app.js** - Main Application Controller
**Responsibility**: Orchestrate all modules and coordinate application flow

**Key Classes/Objects**:
- `BibleTypeApp` class with global instance `app`

**Key Methods**:
- `init()` - Bootstrap application
- `loadChapter()` - Orchestrate chapter loading
- `goToNextChapter()` - Navigate to next chapter
- `setupTypingInput()` - Input field handlers
- `setupKeyboardListeners()` - Global key listeners
- `subscribeToEngine()` - Listen to engine events

**Application Flow**:
1. Check first-time user
2. Load saved position from storage
3. Subscribe to engine events
4. Show dashboard initially
5. Wait for user interaction

**Event Handling Chain**:
```
User keypress 
  ↓ (Global keydown listener)
typingEngine.handleKeystroke()
  ↓ (Fires 'keystroke' event)
app.handleKeystroke()
  ↓
uiManager.updateTypingStats()
storage.debouncedSave()
```

## 🎯 Key Design Decisions

### 1. **Vanilla JavaScript (No Frameworks)**
- **Why**: Minimal overhead, fast initial load, no build step
- **Trade-off**: More manual DOM manipulation, but manageable at this scale

### 2. **Modular Singleton Pattern**
- **Why**: Single source of truth, easy to reason about state
- **Each module**: One singleton instance (`dataLoader`, `typingEngine`, etc.)
- **Benefits**: Clean API, predictable behavior

### 3. **CSS Custom Properties for Theming**
- **Why**: Zero JavaScript for theme switching
- **How**: Change `data-theme` attribute, CSS cascades new values
- **Performance**: No reflows/repaints needed

### 4. **localStorage Abstraction**
- **Why**: Handle private browsing gracefully
- **Fallback**: In-memory storage if localStorage unavailable
- **User Experience**: No error when using private mode

### 5. **Listener Pattern for Events**
- **Why**: Decouple modules (engine doesn't know about UI)
- **Implementation**: `subscribe()` returns unsubscribe function
- **Benefit**: Easy to add/remove listeners, testable

### 6. **Word-Level DOM Spans**
- **Why**: Individual styling of each word and first letter
- **Performance**: Pre-parsed words array for fast lookups
- **UX**: Smooth highlighting and error feedback

## 🔄 Data Flow Example: Typing a Word

```
1. User presses 'I' key
   ↓
2. Global keydown listener triggers
   ↓
3. app.setupKeyboardListeners() intercepted
   → typingEngine.handleKeystroke('I')
   ↓
4. typingEngine compares to currentWord.firstLetter
   ↓
5a. If correct:
    → Advance word
    → Update DOM (add 'completed' class)
    → notifyListeners('word-advanced')
    ↓
5b. If incorrect:
    → Add 'error' class (shake animation)
    → Update stats (incorrect keystroke count)
    → notifyListeners('keystroke')
    ↓
6. app.handleKeystroke() receives event
   ↓
7. uiManager.updateTypingStats()
   ↓
8. storageManager.debouncedSave()
   (saves after 500ms of inactivity)
```

## 🧪 Testing Approach

### Manual Testing Checklist
- [ ] Load Genesis 1
- [ ] Type correctly and verify word progression
- [ ] Type incorrectly and verify error feedback
- [ ] Verify WPM updates
- [ ] Complete chapter, verify modal
- [ ] Switch themes
- [ ] Adjust font size
- [ ] Close and reopen browser (check progress restored)
- [ ] Test on mobile (keyboard appearance)
- [ ] Test keyboard navigation

### Browser DevTools Tips
```javascript
// In console:
typingEngine.currentPosition  // Current location
typingEngine.words            // All words in chapter
typingEngine.getTypingStats() // Current session stats
storageManager.getStats()     // Cumulative stats
dataLoader.cache              // Cached chapters
```

## 🚀 Performance Optimizations

### 1. **Lazy Loading**
- Chapters only fetched when clicked
- No batch loading of all Bible data

### 2. **Prefetching**
- Next chapter prefetched in background (WCAG best practice)
- Uses `loadChapter()` which returns pending promise

### 3. **Request Deduplication**
- Pending requests cached in `pendingRequests` Map
- Multiple clicks same chapter = single request

### 4. **Debounced Saves**
- Progress only saved every 500ms during typing
- Prevents localStorage thrashing

### 5. **CSS Variable Switching**
- Theme change updates `<html>` attribute
- Browser applies CSS cascade (no JavaScript needed)

### 6. **DOM Caching**
- `wordElements` array stores DOM references
- Avoid repeated querySelectorAll

## 🎨 Styling Architecture

### CSS Organization
```css
:root {
    /* Theme variables - all colors and spacing */
}

html[data-theme="dark"] {
    /* Theme overrides */
}

html[data-theme="sepia"] {
    /* Theme overrides */
}

/* Component styles */
.view { }
.modal { }
.typing-container { }

/* Responsive breakpoints at bottom */
@media (max-width: 768px) { }
```

### Responsive Strategy
- **Mobile-first**: Start with mobile styles, enhance for larger screens
- **Breakpoints**: 768px (tablet), 480px (mobile)
- **Flexible units**: rem, %, calc() instead of fixed px
- **Keyboard layout handling**: Special media query for mobile with keyboard

## ♿ Accessibility Implementation

### 1. **Keyboard Navigation**
- Tab order follows logical flow
- Focus visible on all interactive elements
- Escape closes modals

### 2. **Screen Reader Support**
- ARIA attributes on dynamic content
- aria-live for progress updates
- Semantic HTML structure

### 3. **Focus Management**
- `trapFocus()` keeps focus in modal
- Auto-focus first element when modal opens
- Restores focus when modal closes

### 4. **Motion Preferences**
- Respects `prefers-reduced-motion` media query
- Sets transition times to 0 when enabled

### 5. **Color Contrast**
- All text meets WCAG AA standards
- Themes specifically tested for contrast

## 🔧 Common Development Tasks

### Add a New Book
Already baked in! Just add data file:
```bash
data/new_book_name/1.json
```

### Change Font Size Range
Edit HTML input:
```html
<input min="14" max="28" value="18">  <!-- min/max values -->
```

### Add New Theme
1. Add CSS variables in `:root`
2. Add `html[data-theme="mytheme"]` selector
3. Add option to theme select:
```html
<option value="mytheme">My Theme</option>
```

### Add Feature to Settings Modal
1. Add HTML to `#settings-modal .modal-body`
2. Add event listener in `ui-manager.setupEventListeners()`
3. Save to storage in `storageManager.saveSettings()`

### Debug Typing Engine
```javascript
// Watch word-by-word progress
typingEngine.subscribe((eventType, data) => {
    if (eventType === 'word-advanced') {
        console.log('Advanced to word:', data.wordIndex, typingEngine.words[data.wordIndex]);
    }
});
```

## 📊 Performance Metrics

**Target Performance**:
- First paint: < 1s
- Interactive: < 2s  
- Chapter load: < 500ms
- Keystroke response: < 100ms

**Current (with Genesis 1 sample)**:
- HTML: ~15KB
- CSS: ~30KB
- JavaScript: ~40KB
- Total: ~85KB (before gzip: ~20KB)

## 🤝 Contributing Guidelines

When modifying code:

1. **Maintain module boundaries**: Don't have modules reference private properties
2. **Use events**: Prefer listener pattern over direct calls
3. **Handle errors gracefully**: Always show user-friendly messages
4. **Test responsiveness**: Works on mobile, tablet, desktop
5. **Document code**: Comments for non-obvious logic
6. **Update README**: If changing features or structure

## 📚 Further Reading

- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) (MDN)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) (MDN)
- [ARIA Best Practices](https://developer.mozilla.org/en-US/docs/Learn/Accessibility/WAI-ARIA_basics) (MDN)
- [Web Accessibility](https://www.w3.org/WAI/) (W3C)
- [Single Page Applications](https://en.wikipedia.org/wiki/Single-page_application) (Wikipedia)

---

**Happy coding! 🚀**
