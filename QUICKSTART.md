# Bible Type - Quick Start Guide

## 🚀 Get Running in 2 Minutes

### Option 1: Python (Easiest)
```bash
cd ScriptTypeApp
python -m http.server 8000
# Open: http://localhost:8000
```

### Option 2: Node.js
```bash
cd ScriptTypeApp
npx http-server
# Open: http://localhost:8080
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

---

## 📚 Add Bible Data

The app includes sample data for Genesis 1. To add more chapters:

### Quick Method: Manual JSON
1. Create folder: `data/matthew/` (book name, lowercase, underscores)
2. Create file: `data/matthew/1.json`
3. Add verses as JSON array:
```json
[
    "The genealogy of Jesus the Messiah, the son of David, the son of Abraham.",
    "Abraham was the father of Isaac, Isaac the father of Jacob..."
]
```

### Bulk Method: Python Script
```bash
# First, get Bible data (e.g., from OpenBible.info)
# Then run:
python3 scripts/generate_data.py bible.json ./data
```

---

## 🎮 Test the App

1. **Dashboard**: View books and progress
2. **Continue**: Click to start typing
3. **Type**: Press keys for first letter of each word
   - Example verse: "In the beginning"
   - Type: `I` → `t` → `b`
4. **Settings**: Click gear icon to:
   - Change theme (Light/Dark/Sepia)
   - Adjust font size
   - Jump to different chapter
5. **Complete**: Finish chapter → see stats → continue

---

## 🎨 Customize

### Change Theme Colors
Edit `css/styles.css`:
```css
:root {
    /* Light Theme */
    --bg-primary: #ffffff;
    --text-primary: #1a1a1a;
    --accent-primary: #2563eb;
    /* ... etc */
}
```

### Change Fonts
Edit `index.html` head section:
```html
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap" rel="stylesheet">
```
Then update CSS variables in `styles.css`:
```css
--font-ui: 'YourFont', sans-serif;
--font-content: 'YourOtherFont', serif;
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Letter keys** | Type first letter of word |
| **ESC** | Go back to dashboard |
| **Tab** | Navigate UI |

---

## 📁 Project Structure
```
ScriptTypeApp/
├── index.html           # Main page (single-page app)
├── css/styles.css       # All styling + themes
├── js/
│   ├── app.js           # Main app logic
│   ├── typing-engine.js # Game mechanics
│   ├── ui-manager.js    # UI controls
│   ├── data-loader.js   # Load Bible data
│   └── storage-manager.js # Save progress
├── data/
│   └── [book]/[chapter].json  # Bible chapters
└── README.md            # Full documentation
```

---

## 🔍 Troubleshooting

**"Chapter failed to load"**
- Check `data/bookname/1.json` exists
- Verify JSON is valid (use jsonlint.com)

**"Cannot find chapter data"**
- Ensure folder structure matches book names exactly (lowercase, underscores)
- Example: "Song of Solomon" → `data/song_of_solomon/1.json`

**"Progress not saving"**
- Check if browser allows localStorage
- Private/Incognito mode may block it (app uses fallback)

**Mobile typing not working**
- Tap the input area at bottom
- Try landscape orientation

---

## 📖 Book Names (for data folder structure)

Old Testament (39 books):
```
genesis, exodus, leviticus, numbers, deuteronomy, joshua, judges, ruth,
1_samuel, 2_samuel, 1_kings, 2_kings, 1_chronicles, 2_chronicles, ezra,
nehemiah, esther, job, psalms, proverbs, ecclesiastes, song_of_solomon,
isaiah, jeremiah, lamentations, ezekiel, daniel, hosea, joel, amos,
obadiah, jonah, micah, nahum, habakkuk, zephaniah, haggai, zechariah, malachi
```

New Testament (27 books):
```
matthew, mark, luke, john, acts, romans, 1_corinthians, 2_corinthians,
galatians, ephesians, philippians, colossians, 1_thessalonians,
2_thessalonians, 1_timothy, 2_timothy, titus, philemon, hebrews, james,
1_peter, 2_peter, 1_john, 2_john, 3_john, jude, revelation
```

---

## 🚀 Deploy

The app is ready to deploy to any static hosting:

- **GitHub Pages**: Push to `gh-pages` branch
- **Netlify**: Drag and drop folder
- **Vercel**: Import from GitHub
- **Your server**: Copy files to web root

No build step needed! Just serve the files as-is.

---

## 🎯 Features Overview

✅ Type the first letter of each Bible word  
✅ Three beautiful themes (Light/Dark/Sepia)  
✅ Works on desktop, tablet, and phone  
✅ Automatic progress saving  
✅ Word-per-minute tracking  
✅ Fully keyboard accessible  
✅ No internet required (after loading data)  
✅ No tracking or analytics  

---

**Enjoy your meditative typing experience!**
