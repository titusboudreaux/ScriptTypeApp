# Bible Type Project Handbook

A single reference for running the app, preparing data, understanding the architecture, and planning future iterations.

---

## 1. Quick Start

### 1.1 Run the App Locally

```bash
# From the repo root
python -m http.server 8000      # Option A: Python 3
npx http-server                 # Option B: Node.js
# Or use VS Code Live Server on index.html
```

Open the browser to `http://localhost:8000` (or the port reported by your server).

### 1.2 Add Sample Data

1. Create `data/<book-name>/` (lowercase, underscores for spaces) and drop `chapter.json` files (array of verse strings).
2. Or run the processing script (recommended) as described in Section 3 to convert a full Bible JSON dump into the expected structure.

### 1.3 Smoke-Test Checklist

1. Load the Dashboard and confirm the Resume tile shows your saved chapter.
2. Open Library > select Genesis 1 to render text.
3. Type the first letter of each word (`"In the beginning" → I, t, b`).
4. Toggle themes, adjust font size, and confirm progress persists across refreshes.
5. Complete a chapter to view the enhanced completion modal with book progress and ETA.

---

## 2. Bible Data & Multi-Version Support

### 2.1 Folder Structure

```
data/
└── <version_code>/            # esv, kjv, niv, etc.
    ├── version.json          # metadata (name, book count, chapter count)
    ├── genesis/
    │   ├── 1.json            # array of verse strings
    │   └── ...
    ├── exodus/
    └── ... (all 66 canonical books)
```

`version.json` example:
```json
{
  "version": "ESV",
  "name": "English Standard Version",
  "books": 66,
  "total_chapters": 1189
}
```

### 2.2 Chapter File Format

Each `data/<version>/<book>/<chapter>.json` is:
```json
[
  "In the beginning God created the heavens and the earth.",
  "Now the earth was formless and empty, darkness was over the surface of the deep.",
  "And God said, \"Let there be light,\" and there was light."
]
```

### 2.3 Adding Versions

1. Obtain a Bible JSON file (see Section 3 for supported formats and sources).
2. Run `python scripts/process_bible_json.py <input.json> data/<version> --version <CODE>`.
3. Refresh the app. `data-loader` auto-discovers folders with `version.json` and populates the Settings dropdown.
4. Each version has independent progress (ESV progress does not affect KJV, etc.).

### 2.4 Legacy Layout

The older single-version structure (`data/<book>/<chapter>.json`) still loads, but multi-version folders are preferred for new installs because they unlock per-version statistics.

---

## 3. Data Processing Scripts

### 3.1 `process_bible_json.py` (Recommended)

- Handles multiple JSON formats automatically (array of books, `{"books": []}`, nested objects).
- Normalizes folder names (`"1 Samuel" → 1_samuel/`).
- Cleans verse text (removes verse numbers, collapses whitespace).
- Writes `version.json` plus the chapter files described above.
- Validation flag (`--validate`) checks for 66 books / 1,189 chapters.

Usage:
```bash
python scripts/process_bible_json.py <input_json> data/esv --version ESV [--validate]
```

### 3.2 `generate_data.py` (Legacy)

Keeps generating the original single-version structure. Only use for quick samples; all new work should go through `process_bible_json.py`.

### 3.3 Data Sources & Licensing

- KJV is public domain; modern translations (ESV, NIV, NLT, NASB, etc.) require permission.
- API options: https://scripture.api.bible/ or search GitHub for "bible json".
- Always respect translation licensing—these scripts are for personal use only.

---

## 4. Architecture & Module Reference

| Module | Responsibility | Highlights |
|--------|----------------|------------|
| `app.js` | Orchestrator/controller | Initializes modules, wires listeners, handles resume + navigation |
| `typing-engine.js` | Core typing logic | Parses words (skipping punctuation), tracks `currentPosition`, raises `keystroke`, `word-advanced`, `chapter-completed`, `error` events |
| `ui-manager.js` | Views + theming | Manages dashboard/library/typing views, modals, theme + font sliders, accessibility helpers |
| `data-loader.js` | Bible data fetcher | Discovers versions, caches chapter requests, prefetches next chapter |
| `storage-manager.js` | Persistence facade | Wraps Dexie/localStorage hybrid for stats, settings, notes, word-level progress with debounced writes |
| `audio-manager.js` | Text-to-speech sidekick | Optional queue-based playback that keeps audio in sync with fast typists |
| `notes-manager.js` | Chapter notes | 280 character note per chapter, surfaced in Notes Hub and typing view |
| `library-manager.js` | Dashboard/library glue | Accordion library view, progress-aware chapter buttons, resume routing |

### 4.1 Event Flow Snapshot

```
keydown/input → app.setupKeyboardListeners()
    → typingEngine.handleKeystroke()
        → notifyListeners('word-advanced')
            → app.handleWordAdvanced() / storageManager.debouncedSave()
```

### 4.2 Persistence Notes

- Dexie-backed `dbManager` stores progress records with `{ version, bookId, chapterNumber, wordIndex, charIndex, wordCount, completed }`.
- `storageManager.createDebouncedProgressSave(500)` captures typing stats + position without thrashing writes.
- Library chapter buttons now read `wordCount` to render gradient progress fills.

### 4.3 Theming & Layout

- CSS custom properties define Light/Dark/Sepia tokens once; JS flips `data-theme` on `<html>`.
- Desktop uses CSS grid to keep the left nav persistent while retaining the header (settings button is always visible).
- Progress overlays respect `--chapter-progress-fill`, defined per theme for accessible contrast.

---

## 5. Accessibility & UX Enhancements

### 5.1 Typography & Motion

- App-wide font stack switched to **OpenDyslexic** (fallback Trebuchet MS) to reduce letter flipping for dyslexic readers.
- Error feedback uses a gentle pulse animation (400 ms) instead of a shake.
- `prefers-reduced-motion` toggles down animation timing automatically.

### 5.2 Chapter Complete Modal

- Displays per-book progress bar, chapter counts, and ETA to finish the current book (based on the session duration).
- Estimates format: `~Xd Yh`, `~Xh Ym`, or `~Xm`; shows `Already completed!` when done.

### 5.3 Notes Hub & Resume UX

- Dashboard includes a Notes Hub with snippets linking to chapters.
- Global Resume tab/button always loads the last-known chapter; blank-state defaults to Genesis 1.

### 5.4 Library Progress Fill

- Chapter buttons show completion percentage via a vertical gradient overlay.
- Works for partial progress thanks to stored `wordCount` values; completed chapters keep the solid accent color.

---

## 6. Roadmap & Feature Strategy

Derived from the v2 "App-ification" plan:

1. **Navigation Shell** – Persistent header with settings/back buttons, mobile bottom nav transforming into a sidebar on desktop.
2. **Dashboard v2** – Resume card + Notes Hub front-and-center.
3. **Library v2** – Accordion of books, tap-to-expand grids, dynamic progress fill, and note badges.
4. **Reader Enhancements** – Full-word mode with case sensitivity toggle, TTS queue, collapsible notes panel.
5. **Storage Backend** – Dexie-first persistence with silent migration from legacy localStorage keys.
6. **Polish & QA** – Accessibility, responsive spacing, animations, and documentation kept in sync.

---

## 7. Maintenance & Issue Log

### 7.1 Recent Fixes

| Item | Status | Notes |
|------|--------|-------|
| Settings button visibility in new desktop layout | ✅ Fixed | Header now always renders; CSS grid keeps it present at all sizes |
| Resume tab blank-state | ✅ Fixed | Resume falls back to Genesis 1 if no saved position; library chapter selection loads requested coordinates correctly |
| Typing input regression | ✅ Fixed | Input listener scoped to typing view; keystrokes immediately hand off to `typingEngine` |
| Desktop spacing | ✅ Adjusted | Dashboard/library padding scales up on larger screens |
| Library progress visualization | ✅ Added | Chapter buttons read Dexie word counts to fill gradient overlay |

### 7.2 Ongoing Watch List

- Continue validating Dexie migrations for returning users.
- Monitor TTS queue performance for ultra-fast typists.
- Keep Bible processing script mappings updated when new abbreviations appear.

---

For day-to-day development tasks (running tests, editing modules, etc.), refer to this handbook first; the root `README.md` now links here instead of duplicating the information scattered across multiple Markdown files.
