# Bible Type – Meditative Typing App

Bible Type is a minimalist, Scripture-based typing experience: type the first letter of every word to move through all 1,189 chapters at a calm, deliberate pace. The interface stays out of the way so the text can take center stage.

## Highlights

- Full Bible coverage across multiple translations with per-version stats
- Typing flow that checks only the first character of each word (punctuation skipped automatically)
- Dexie-backed persistence with resume, notes, and progress overlays in the library
- Responsive layout with Light/Dark/Sepia themes, adjustable typography, and desktop-first navigation
- Accessibility upgrades: OpenDyslexic default font, focus states, motion-aware animations, screen reader announcements

👉 **Need the full playbook?** See `docs/PROJECT_HANDBOOK.md` for setup, architecture deep-dives, accessibility details, and the roadmap. All previous Markdown guides were consolidated there.

## Quick Start

```bash
git clone <repository-url>
cd ScriptTypeApp

# Serve the app
python -m http.server 8000        # or npx http-server / Live Server

# Browse
open http://localhost:8000        # replace with your port if different
```

Populate `data/` with at least one Bible version before loading the typing view.

## Bible Data in 60 Seconds

```bash
python scripts/process_bible_json.py path/to/ESV.json data/esv --version ESV
python scripts/process_bible_json.py path/to/KJV.json data/kjv --version KJV
```

- Creates `data/<version>/version.json` plus `book/chapter.json` files (array of verse strings).
- Versions auto-populate in the in-app Settings menu and maintain independent progress.
- `docs/PROJECT_HANDBOOK.md` Section 2 covers directory conventions, JSON formats, and sourcing tips.

## Architecture Snapshot

| Layer | Summary |
|-------|---------|
| `app.js` | Controller that wires listeners, handles global keyboard input, and orchestrates view changes. |
| `typing-engine.js` | Parses chapter text into words, validates keystrokes, and emits `word-advanced` / `chapter-completed` events. |
| `ui-manager.js` | Dashboard + library + typing views, modal system, theming, responsive layout tweaks. |
| `storage-manager.js` + `db-manager.js` | Dexie/localStorage hybrid for settings, stats, per-chapter word counts, and notes (with debounce). |
| `library-manager.js` | Accordion-style book list with progress fills and quick navigation. |

Additional modules such as `audio-manager.js` and `notes-manager.js` plug into the same listener pattern. For the full diagram and event flow, read Section 4 of the handbook.

## Accessibility & UX Notes

- Default font stack favors OpenDyslexic to reduce letter flipping, with Merriweather/Inter as fallbacks.
- Error states rely on soft pulses instead of harsh shakes; respects `prefers-reduced-motion`.
- Chapter completion modal shows per-book progress, ETA, and note shortcuts.

## Need Help?

- Read `docs/PROJECT_HANDBOOK.md` first—it replaces the older Quickstart, Developer Guide, Data Structure, and other Markdown files.
- For Bible data sourcing or script usage, see Section 3 of the handbook (`scripts/process_bible_json.py`).
- Open an issue if you hit something unexpected; mention browser + version + reproduction steps.

**Made with ❤️ for quiet, focused practice.**
