# Multi-Version Bible Support - Quick Start Guide

This guide explains how to add and use multiple Bible versions in the Bible Type app.

## 📋 Overview

The Bible Type app now supports **multiple Bible versions** (ESV, KJV, NIV, etc.). Each version:
- Has **separate progress tracking** (your ESV progress is independent from KJV)
- Is stored in its own folder: `data/esv/`, `data/kjv/`, etc.
- Can be switched on-the-fly in Settings

## 🚀 Quick Start: Adding a New Version

### Step 1: Get Bible JSON Data

You need a Bible JSON file in one of these formats:

**Format A (Array of Books):**
```json
[
  {
    "book": "Genesis",
    "chapters": [
      {
        "chapter": 1,
        "verses": [
          "In the beginning God created the heavens and the earth.",
          "And the earth was without form..."
        ]
      }
    ]
  }
]
```

**Format B (Object with books key):**
```json
{
  "books": [
    {
      "name": "Genesis",
      "chapters": [...]
    }
  ]
}
```

### Step 2: Process the Bible JSON

Run the processing script from the project root:

```bash
# For ESV
python scripts/process_bible_json.py "path/to/ESV_bible.json" data/esv --version ESV

# For KJV
python scripts/process_bible_json.py "path/to/KJV_bible.json" data/kjv --version KJV

# For NIV
python scripts/process_bible_json.py "path/to/NIV_bible.json" data/niv --version NIV
```

**Parameters:**
- `input_file`: Path to your Bible JSON file
- `output_dir`: Output directory (always use `data/<version_code>`)
- `--version`: Version code (ESV, KJV, NIV, etc.)

### Step 3: Verify Output

After processing, you should see:

```
data/
├── esv/
│   ├── version.json          # Version metadata
│   ├── genesis/
│   │   ├── 1.json
│   │   ├── 2.json
│   │   └── ...
│   ├── exodus/
│   └── ...
├── kjv/
│   ├── version.json
│   ├── genesis/
│   └── ...
```

### Step 4: Use in App

1. Open the app in your browser
2. Click ⚙️ **Settings**
3. Select your desired version from **Bible Version** dropdown
4. Start typing!

## 📊 Data Structure

### Directory Structure
```
data/
└── <version_code>/          # e.g., "esv", "kjv"
    ├── version.json         # Metadata file
    ├── genesis/
    │   ├── 1.json          # Array of verse strings
    │   ├── 2.json
    │   └── ...
    ├── exodus/
    └── ... (all 66 books)
```

### version.json Format
```json
{
  "version": "ESV",
  "name": "English Standard Version",
  "books": 66,
  "total_chapters": 1189
}
```

### Chapter File Format (e.g., `genesis/1.json`)
```json
[
  "In the beginning God created the heavens and the earth.",
  "And the earth was without form and void...",
  "And God said, Let there be light..."
]
```

## 🔧 Technical Details

### How Version Discovery Works

1. **On App Init**: `dataLoader.discoverVersions()` checks for common versions
2. **Tries to load**: `data/<version>/version.json` for each
3. **Populates UI**: Successful versions appear in Settings dropdown

### Supported Versions

The script recognizes these version codes:
- **ESV** - English Standard Version
- **KJV** - King James Version
- **NIV** - New International Version
- **NKJV** - New King James Version
- **NLT** - New Living Translation
- **NASB** - New American Standard Bible
- **CSB** - Christian Standard Bible
- **MSG** - The Message
- **AMP** - Amplified Bible
- **NRSV** - New Revised Standard Version

### Book Name Normalization

The script automatically handles various book name formats:
- `"1 Samuel"` → `1_samuel/`
- `"Song of Solomon"` → `song_of_solomon/`
- `"Psalms"`, `"Psalm"`, `"Ps"` → `psalms/`

## 🐛 Troubleshooting

### "Version not available" error

**Cause**: The version folder doesn't exist or `version.json` is missing.

**Fix**:
```bash
# Re-run the processing script
python scripts/process_bible_json.py "input.json" data/esv --version ESV

# Verify version.json exists
cat data/esv/version.json
```

### Chapters not loading

**Cause**: Book folder name mismatch or missing chapter files.

**Fix**:
```bash
# Check folder structure
ls data/esv/

# Should see: genesis, exodus, leviticus, etc.
# If you see "1_samuel" but expect "1samuel", the script handles this
```

### Progress disappeared after version switch

**Behavior**: This is **by design**! Each version has independent progress.

- Your ESV progress: `bibletype_chapter_esv_1_1`
- Your KJV progress: `bibletype_chapter_kjv_1_1`

Switching back to ESV will restore your ESV progress.

## 💾 LocalStorage Keys

Progress is stored per-version:
```javascript
// Old format (backward compatible)
bibletype_chapter_1_1

// New format (with version)
bibletype_chapter_esv_1_1
bibletype_chapter_kjv_1_5
```

Settings store active version:
```javascript
bibletype_settings: {
  theme: "dark",
  fontSize: 18,
  version: "esv"  // ← Saved version
}
```

## 🔍 Validation

To validate your data after processing:

```bash
python scripts/process_bible_json.py input.json data/esv --version ESV --validate
```

This checks:
- ✅ Number of books (expected: 66)
- ✅ Total chapters (expected: ~1,189)
- ✅ Total verses counted

## 📚 Example: Adding 3 Versions

```bash
# Download Bible JSON files (not included in this repo)
# Place them in a folder, e.g., ~/Downloads/

# Process each version
python scripts/process_bible_json.py ~/Downloads/ESV.json data/esv --version ESV
python scripts/process_bible_json.py ~/Downloads/KJV.json data/kjv --version KJV
python scripts/process_bible_json.py ~/Downloads/NIV.json data/niv --version NIV

# Start local server
python -m http.server 8000

# Open http://localhost:8000 and enjoy!
```

## 🎯 Key Features

1. **Independent Progress**: Complete Genesis in ESV and KJV separately
2. **Instant Switching**: Change versions mid-session (current chapter reloads)
3. **Auto-Discovery**: New versions appear in UI automatically
4. **Backward Compatible**: Old data format still works

## 📖 Where to Get Bible JSON Data

Bible JSON files are NOT included in this repository. You can:

1. **Use Bible APIs**: Download from [api.scripture.api.bible](https://scripture.api.bible/)
2. **Convert from other formats**: Use tools to convert XML/CSV to JSON
3. **Open source Bibles**: Search GitHub for "bible json" repositories
4. **Create your own**: Use the processing script's flexible parser

## ✨ Advanced Usage

### Custom Version Names

Edit the `get_version_full_name()` function in `process_bible_json.py`:

```python
def get_version_full_name(version_code):
    version_names = {
        'KJV': 'King James Version',
        'CUSTOM': 'My Custom Translation',  # ← Add here
    }
    return version_names.get(version_code.upper(), version_code)
```

### Programmatic Version Switching

```javascript
// In browser console or your own code
await app.changeVersion('kjv');
```

---

**Need help?** Check the main [README.md](README.md) or [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
