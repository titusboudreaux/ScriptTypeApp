# Data Structure Reference

This document explains how to organize and format Bible data for the Bible Type app.

## Directory Structure

The app expects data files in this format:

```
data/
├── genesis/
│   ├── 1.json
│   ├── 2.json
│   ├── 3.json
│   └── ... (up to 50 files for Genesis)
├── exodus/
│   ├── 1.json
│   ├── 2.json
│   └── ... (up to 40 files for Exodus)
├── leviticus/
│   └── ...
├── matthew/
│   └── ...
└── revelation/
    ├── 1.json
    ├── 2.json
    └── ... (up to 22 files for Revelation)
```

## File Naming Convention

1. **Folder names** must be lowercase with underscores for spaces:
   - "Genesis" → `genesis/`
   - "1 Samuel" → `1_samuel/`
   - "Song of Solomon" → `song_of_solomon/`
   - "1 Corinthians" → `1_corinthians/`

2. **File names** are chapter numbers:
   - First chapter → `1.json`
   - Second chapter → `2.json`
   - etc.

## File Format

Each chapter file is a simple JSON array of strings. Each string is a verse:

```json
[
    "In the beginning God created the heavens and the earth.",
    "Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.",
    "And God said, 'Let there be light,' and there was light.",
    "God saw that the light was good, and he separated the light from the darkness.",
    "God called the light 'day,' and the darkness he called 'night.' And there was evening, and there was morning—the first day."
]
```

### Rules:
- Must be a JSON array `[...]`
- Each element must be a string (verse text)
- Verses should be one per line for readability
- Verse should include punctuation and be naturally readable
- Empty verses should be omitted

## Complete Book List (Folder Names)

### Old Testament (39 books)

| # | Name | Chapters | Folder |
|---|------|----------|--------|
| 1 | Genesis | 50 | `genesis` |
| 2 | Exodus | 40 | `exodus` |
| 3 | Leviticus | 27 | `leviticus` |
| 4 | Numbers | 36 | `numbers` |
| 5 | Deuteronomy | 34 | `deuteronomy` |
| 6 | Joshua | 24 | `joshua` |
| 7 | Judges | 21 | `judges` |
| 8 | Ruth | 4 | `ruth` |
| 9 | 1 Samuel | 31 | `1_samuel` |
| 10 | 2 Samuel | 24 | `2_samuel` |
| 11 | 1 Kings | 22 | `1_kings` |
| 12 | 2 Kings | 25 | `2_kings` |
| 13 | 1 Chronicles | 29 | `1_chronicles` |
| 14 | 2 Chronicles | 36 | `2_chronicles` |
| 15 | Ezra | 10 | `ezra` |
| 16 | Nehemiah | 13 | `nehemiah` |
| 17 | Esther | 10 | `esther` |
| 18 | Job | 42 | `job` |
| 19 | Psalms | 150 | `psalms` |
| 20 | Proverbs | 31 | `proverbs` |
| 21 | Ecclesiastes | 12 | `ecclesiastes` |
| 22 | Song of Solomon | 8 | `song_of_solomon` |
| 23 | Isaiah | 66 | `isaiah` |
| 24 | Jeremiah | 52 | `jeremiah` |
| 25 | Lamentations | 5 | `lamentations` |
| 26 | Ezekiel | 48 | `ezekiel` |
| 27 | Daniel | 12 | `daniel` |
| 28 | Hosea | 14 | `hosea` |
| 29 | Joel | 3 | `joel` |
| 30 | Amos | 9 | `amos` |
| 31 | Obadiah | 1 | `obadiah` |
| 32 | Jonah | 4 | `jonah` |
| 33 | Micah | 7 | `micah` |
| 34 | Nahum | 3 | `nahum` |
| 35 | Habakkuk | 3 | `habakkuk` |
| 36 | Zephaniah | 3 | `zephaniah` |
| 37 | Haggai | 2 | `haggai` |
| 38 | Zechariah | 14 | `zechariah` |
| 39 | Malachi | 4 | `malachi` |

### New Testament (27 books)

| # | Name | Chapters | Folder |
|---|------|----------|--------|
| 40 | Matthew | 28 | `matthew` |
| 41 | Mark | 16 | `mark` |
| 42 | Luke | 24 | `luke` |
| 43 | John | 21 | `john` |
| 44 | Acts | 28 | `acts` |
| 45 | Romans | 16 | `romans` |
| 46 | 1 Corinthians | 16 | `1_corinthians` |
| 47 | 2 Corinthians | 13 | `2_corinthians` |
| 48 | Galatians | 6 | `galatians` |
| 49 | Ephesians | 6 | `ephesians` |
| 50 | Philippians | 4 | `philippians` |
| 51 | Colossians | 4 | `colossians` |
| 52 | 1 Thessalonians | 5 | `1_thessalonians` |
| 53 | 2 Thessalonians | 3 | `2_thessalonians` |
| 54 | 1 Timothy | 6 | `1_timothy` |
| 55 | 2 Timothy | 4 | `2_timothy` |
| 56 | Titus | 3 | `titus` |
| 57 | Philemon | 1 | `philemon` |
| 58 | Hebrews | 13 | `hebrews` |
| 59 | James | 5 | `james` |
| 60 | 1 Peter | 5 | `1_peter` |
| 61 | 2 Peter | 3 | `2_peter` |
| 62 | 1 John | 5 | `1_john` |
| 63 | 2 John | 1 | `2_john` |
| 64 | 3 John | 1 | `3_john` |
| 65 | Jude | 1 | `jude` |
| 66 | Revelation | 22 | `revelation` |

## Example Data Files

### Example: Genesis 1.json
```json
[
    "In the beginning God created the heavens and the earth.",
    "Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.",
    "And God said, \"Let there be light,\" and there was light.",
    "God saw that the light was good, and he separated the light from the darkness.",
    "God called the light \"day,\" and the darkness he called \"night.\" And there was evening, and there was morning—the first day."
]
```

### Example: Matthew 1.json
```json
[
    "This is the genealogy of Jesus the Messiah, the son of David, the son of Abraham.",
    "Abraham was the father of Isaac, Isaac the father of Jacob, and Jacob the father of Judah and his brothers.",
    "Judah the father of Perez and Zerah, whose mother was Tamar, Perez the father of Hezron, and Hezron the father of Ram."
]
```

## Using the Data Generation Script

If you have a complete Bible JSON file from an API or database, use the provided script:

```bash
python3 scripts/generate_data.py bible.json ./data
```

### Expected Input Format

The script expects a JSON file with this structure:

```json
[
    {
        "book": "Genesis",
        "chapters": [
            {
                "number": 1,
                "verses": [
                    "In the beginning God created the heavens and the earth.",
                    "Now the earth was formless and empty..."
                ]
            },
            {
                "number": 2,
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

## Recommended Bible Text Sources

1. **Bible JSON API** (Free)
   - https://github.com/BibleJS/bible
   - Complete Bible in JSON format

2. **OpenBible.info** (Free)
   - https://openbible.info/
   - Multiple Bible versions available

3. **CrosswayBibles.org** (Free)
   - APIs for ESV and other versions

4. **BibleGateway** (Free for research)
   - Can export to various formats

## Validation Checklist

- [ ] All book folders created with correct names (lowercase, underscores)
- [ ] All chapter files numbered correctly (1, 2, 3, etc.)
- [ ] Each chapter file is valid JSON (test with jsonlint.com)
- [ ] Each file contains an array of strings
- [ ] No empty chapter files
- [ ] File paths match expected structure
- [ ] Total chapters match book counts listed above

## Troubleshooting

**"Chapter not found" error**
- Check folder name matches exactly (case-sensitive on some systems)
- Verify chapter number in JSON matches filename
- Ensure JSON is valid

**"Invalid data format" error**
- Verify each file is a JSON array `[...]`
- Ensure each element is a string `"..."`
- Check for trailing commas or other JSON syntax errors

**App shows only Genesis
**
- Only Genesis 1 is included as sample
- Generate or add more data files following this structure
- Use the Python script to batch-create from a Bible API

## Total Statistics

- **Total Books**: 66
- **Total Chapters**: 1,189
- **Testament Breakdown**: 39 OT, 27 NT
- **Average Chapters/Book**: ~18
- **Largest Book**: Psalms (150 chapters)
- **Smallest Books**: Obadiah, Philemon, 2 John, 3 John (1 chapter each)
