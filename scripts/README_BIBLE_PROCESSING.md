# Bible Data Processing Scripts

This directory contains scripts for processing Bible JSON files into the format required by the Bible Type app.

## 📋 Scripts Overview

### `process_bible_json.py` (Recommended)

**Purpose**: Convert Bible JSON files from various formats into the Bible Type app's data structure with multi-version support.

**Features**:
- ✅ Handles multiple JSON formats automatically
- ✅ Normalizes book names (handles "1 Samuel", "1Samuel", "1 Sam", etc.)
- ✅ Cleans verse text (removes verse numbers, extra whitespace)
- ✅ Generates version metadata
- ✅ Validates data completeness
- ✅ Supports 66 canonical books

**Usage**:
```bash
python process_bible_json.py <input_json> <output_dir> --version <VERSION_CODE>
```

**Examples**:
```bash
# Process ESV Bible
python process_bible_json.py "ESV_bible.json" ../data/esv --version ESV

# Process KJV with validation
python process_bible_json.py "KJV_bible.json" ../data/kjv --version KJV --validate

# Process NIV
python process_bible_json.py "NIV_bible.json" ../data/niv --version NIV
```

### `generate_data.py` (Legacy)

**Purpose**: Basic sample data generator (not recommended for production use).

**Usage**: See `MULTI_VERSION_QUICKSTART.md` for the recommended `process_bible_json.py` workflow instead.

## 📥 Input JSON Formats

The `process_bible_json.py` script supports multiple input formats:

### Format 1: Array of Books
```json
[
  {
    "book": "Genesis",
    "chapters": [
      {
        "chapter": 1,
        "verses": ["verse 1 text", "verse 2 text", ...]
      },
      {
        "chapter": 2,
        "verses": [...]
      }
    ]
  },
  {
    "book": "Exodus",
    "chapters": [...]
  }
]
```

### Format 2: Object with Books Key
```json
{
  "books": [
    {
      "name": "Genesis",
      "chapters": [
        {
          "number": 1,
          "verses": ["verse 1 text", ...]
        }
      ]
    }
  ]
}
```

### Format 3: Nested Object
```json
{
  "bible": [
    {
      "bookName": "Genesis",
      "chapter": [
        {
          "chapterNumber": 1,
          "verse": ["verse 1 text", ...]
        }
      ]
    }
  ]
}
```

**The script handles all these formats automatically!**

## 📤 Output Structure

The script generates this structure:

```
data/
└── <version_code>/          # e.g., "esv", "kjv", "niv"
    ├── version.json         # Version metadata
    ├── genesis/
    │   ├── 1.json          # Chapter 1 verses (array of strings)
    │   ├── 2.json
    │   ├── ...
    │   └── 50.json
    ├── exodus/
    │   ├── 1.json
    │   └── ...
    └── ... (all 66 books)
```

### version.json
```json
{
  "version": "ESV",
  "name": "English Standard Version",
  "books": 66,
  "total_chapters": 1189
}
```

### Chapter File Example (genesis/1.json)
```json
[
  "In the beginning God created the heavens and the earth.",
  "And the earth was without form, and void; and darkness was upon the face of the deep.",
  "And God said, Let there be light: and there was light."
]
```

## 🔧 Script Features

### Book Name Normalization

The script automatically normalizes various book name formats:

| Input | Output Folder |
|-------|---------------|
| "Genesis", "Gen" | `genesis/` |
| "1 Samuel", "1Sam", "1 Sam" | `1_samuel/` |
| "Song of Solomon", "SOS" | `song_of_solomon/` |
| "Psalms", "Psalm", "Ps" | `psalms/` |

**Mapping**: See `BOOK_NAME_MAP` in `process_bible_json.py` for full list.

### Verse Text Cleaning

The script removes:
- Leading verse numbers (e.g., "1 In the beginning" → "In the beginning")
- Extra whitespace
- Multiple consecutive spaces

### Version Code Recognition

Supported version codes (case-insensitive):
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

Add more in `get_version_full_name()` function.

## 🧪 Validation

Use `--validate` flag to check data completeness:

```bash
python process_bible_json.py input.json data/esv --version ESV --validate
```

**Validation checks**:
- ✅ Number of books found (expected: 66)
- ✅ Total chapters (expected: ~1,189)
- ✅ Total verses counted
- ⚠️ Warns if counts are lower than expected

## 🐛 Troubleshooting

### Error: "Input file not found"

**Fix**: Provide absolute path or correct relative path:
```bash
python process_bible_json.py "C:/Downloads/bible.json" ../data/esv --version ESV
```

### Error: "Unrecognized Bible JSON format"

**Cause**: JSON structure doesn't match expected formats.

**Fix**: 
1. Check your JSON is valid (use [jsonlint.com](https://jsonlint.com))
2. Ensure it has books → chapters → verses structure
3. Modify the `parse_bible_json()` function to handle your format

### Warning: "Expected 66 books, found X"

**Cause**: Input data may be incomplete or use apocryphal books.

**Fix**:
- If X < 66: Input data missing books
- If X > 66: Input includes apocrypha (the app only uses canonical 66)

### Book folder not created

**Cause**: Book name not in `BOOK_NAME_MAP`.

**Fix**: Add mapping in `process_bible_json.py`:
```python
BOOK_NAME_MAP = {
    # ... existing mappings ...
    'your_book_name': 'output_folder_name',
}
```

## 📚 Example Workflow

### Complete Multi-Version Setup

```bash
# 1. Navigate to scripts directory
cd scripts/

# 2. Process multiple versions
python process_bible_json.py ~/Downloads/ESV.json ../data/esv --version ESV --validate
python process_bible_json.py ~/Downloads/KJV.json ../data/kjv --version KJV --validate
python process_bible_json.py ~/Downloads/NIV.json ../data/niv --version NIV --validate

# 3. Verify output
ls ../data/
# Should show: esv/, kjv/, niv/

# 4. Check a sample chapter
cat ../data/esv/genesis/1.json

# 5. Check version metadata
cat ../data/esv/version.json

# 6. Start the app
cd ..
python -m http.server 8000

# 7. Open browser to http://localhost:8000
```

## 🔍 Advanced: Custom Processing

### Add Custom Book Name Mapping

Edit `BOOK_NAME_MAP` in `process_bible_json.py`:

```python
BOOK_NAME_MAP = {
    # ... existing mappings ...
    'custom_abbreviation': 'canonical_name',
    'song': 'song_of_solomon',  # Example
}
```

### Modify Verse Cleaning Logic

Edit `clean_verse_text()` function:

```python
def clean_verse_text(verse_text):
    # Remove verse numbers
    cleaned = re.sub(r'^\d+\s+', '', verse_text)
    
    # Your custom cleaning here
    cleaned = cleaned.replace('[', '').replace(']', '')  # Remove brackets
    
    return cleaned.strip()
```

### Handle Alternative JSON Structure

Edit `parse_bible_json()` function to add your format:

```python
def parse_bible_json(input_file):
    # ... existing code ...
    
    # Add your custom format handling
    if 'my_custom_key' in data:
        books = data['my_custom_key']
    
    # ... rest of parsing ...
```

## 📖 Where to Get Bible JSON Data

Bible JSON files are **NOT included** in this repository due to copyright.

**Options**:
1. **Bible APIs**: [api.scripture.api.bible](https://scripture.api.bible/)
2. **Open Source Projects**: Search GitHub for "bible json"
3. **Commercial Sources**: Purchase from Bible software vendors
4. **DIY**: Convert from XML/CSV using tools

## ⚙️ Requirements

**Python**: 3.6+

**Standard Library Only**: No external dependencies!

**Modules used**:
- `json` - Parse/write JSON
- `os` - File operations
- `sys` - Command-line arguments
- `argparse` - Argument parsing
- `re` - Regex for text cleaning
- `pathlib` - Path handling

## 🚀 Performance

**Typical Processing Time**:
- Small book (Ruth, 4 chapters): < 1 second
- Full Bible (1,189 chapters): 3-10 seconds
- Depends on: JSON size, disk speed, verse count

**Output Size**:
- Average chapter file: 2-5 KB
- Full Bible version: 3-8 MB
- 3 versions: ~15-25 MB total

## 📝 License Notes

**Important**: The scripts in this directory are licensed under the project's license. However:

- **Bible text data is NOT included** and must be obtained separately
- Bible translations have **their own copyrights**
- Check usage terms for your specific Bible version
- Some versions (KJV) are public domain
- Modern versions (ESV, NIV, NLT) require permission for distribution

**This tool is for personal use. Do not distribute Bible text data without proper licenses.**

---

**For more information**, see:
- [MULTI_VERSION_QUICKSTART.md](../MULTI_VERSION_QUICKSTART.md) - User guide for multi-version support
- [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) - Technical architecture documentation
- [README.md](../README.md) - Main project documentation
