#!/usr/bin/env python3
"""
Process the specific Bible JSON format from the user's files.

This handles the format where each file is structured as:
{
  "Genesis": {
    "1": {
      "1": "verse text",
      "2": "verse text"
    }
  }
}
"""

import json
import os
import sys
import re
from pathlib import Path

# Book name mapping to standardized folder names
BOOK_NAME_MAP = {
    'genesis': 'genesis',
    'exodus': 'exodus',
    'leviticus': 'leviticus',
    'numbers': 'numbers',
    'deuteronomy': 'deuteronomy',
    'joshua': 'joshua',
    'judges': 'judges',
    'ruth': 'ruth',
    '1 samuel': '1_samuel',
    '2 samuel': '2_samuel',
    '1 kings': '1_kings',
    '2 kings': '2_kings',
    '1 chronicles': '1_chronicles',
    '2 chronicles': '2_chronicles',
    'ezra': 'ezra',
    'nehemiah': 'nehemiah',
    'esther': 'esther',
    'job': 'job',
    'psalm': 'psalms',
    'psalms': 'psalms',
    'proverbs': 'proverbs',
    'ecclesiastes': 'ecclesiastes',
    'song of solomon': 'song_of_solomon',
    'isaiah': 'isaiah',
    'jeremiah': 'jeremiah',
    'lamentations': 'lamentations',
    'ezekiel': 'ezekiel',
    'daniel': 'daniel',
    'hosea': 'hosea',
    'joel': 'joel',
    'amos': 'amos',
    'obadiah': 'obadiah',
    'jonah': 'jonah',
    'micah': 'micah',
    'nahum': 'nahum',
    'habakkuk': 'habakkuk',
    'zephaniah': 'zephaniah',
    'haggai': 'haggai',
    'zechariah': 'zechariah',
    'malachi': 'malachi',
    'matthew': 'matthew',
    'mark': 'mark',
    'luke': 'luke',
    'john': 'john',
    'acts': 'acts',
    'romans': 'romans',
    '1 corinthians': '1_corinthians',
    '2 corinthians': '2_corinthians',
    'galatians': 'galatians',
    'ephesians': 'ephesians',
    'philippians': 'philippians',
    'colossians': 'colossians',
    '1 thessalonians': '1_thessalonians',
    '2 thessalonians': '2_thessalonians',
    '1 timothy': '1_timothy',
    '2 timothy': '2_timothy',
    'titus': 'titus',
    'philemon': 'philemon',
    'hebrews': 'hebrews',
    'james': 'james',
    '1 peter': '1_peter',
    '2 peter': '2_peter',
    '1 john': '1_john',
    '2 john': '2_john',
    '3 john': '3_john',
    'jude': 'jude',
    'revelation': 'revelation',
}

def normalize_book_name(book_name):
    """Normalize book name to canonical folder name."""
    normalized = book_name.lower().strip()
    normalized = re.sub(r'[^\w\s]', '', normalized)  # Remove punctuation
    normalized = re.sub(r'\s+', ' ', normalized)  # Normalize whitespace
    
    if normalized in BOOK_NAME_MAP:
        return BOOK_NAME_MAP[normalized]
    
    # Fallback: convert spaces to underscores
    return normalized.replace(' ', '_')

def clean_verse_text(verse_text):
    """Clean verse text by removing extra whitespace and newlines."""
    # Replace newlines with spaces
    cleaned = verse_text.replace('\n', ' ')
    
    # Remove multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    return cleaned.strip()

def parse_user_bible_json(input_file):
    """
    Parse the user's Bible JSON format.
    Expected structure: {book: {chapter: {verse_num: verse_text}}}
    Returns: dict with structure {book_name: {chapter_num: [verses]}}
    """
    print(f"Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    bible_data = {}
    
    for book_name, chapters in data.items():
        normalized_name = normalize_book_name(book_name)
        bible_data[normalized_name] = {}
        
        print(f"Processing {book_name} -> {normalized_name}")
        
        for chapter_num_str, verses in chapters.items():
            chapter_num = int(chapter_num_str)
            
            # Convert verse dict to ordered list
            verse_list = []
            if isinstance(verses, dict):
                # Sort by verse number and extract text
                for verse_num in sorted(verses.keys(), key=int):
                    verse_text = verses[verse_num]
                    cleaned_text = clean_verse_text(verse_text)
                    if cleaned_text:  # Only add non-empty verses
                        verse_list.append(cleaned_text)
            
            if verse_list:
                bible_data[normalized_name][chapter_num] = verse_list
                print(f"  Chapter {chapter_num}: {len(verse_list)} verses")
    
    return bible_data

def generate_data_files(bible_data, output_dir, version_code):
    """Generate data files from parsed Bible data."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create version metadata
    total_chapters = sum(len(chapters) for chapters in bible_data.values())
    version_metadata = {
        'version': version_code,
        'name': get_version_full_name(version_code),
        'books': len(bible_data),
        'total_chapters': total_chapters,
    }
    
    metadata_file = output_path / 'version.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(version_metadata, f, indent=2, ensure_ascii=False)
    
    print(f"Created version metadata: {metadata_file}")
    
    # Generate chapter files
    total_files = 0
    for book_name, chapters in bible_data.items():
        book_dir = output_path / book_name
        book_dir.mkdir(exist_ok=True)
        
        for chapter_num, verses in chapters.items():
            chapter_file = book_dir / f"{chapter_num}.json"
            
            with open(chapter_file, 'w', encoding='utf-8') as f:
                json.dump(verses, f, indent=2, ensure_ascii=False)
            
            total_files += 1
    
    print(f"✅ Created {total_files} chapter files for {version_code}")
    print(f"📁 Output: {output_dir}")
    
    return total_files

def get_version_full_name(version_code):
    """Get full name of Bible version from code."""
    version_names = {
        'ESV': 'English Standard Version',
        'KJV': 'King James Version',
        'NIV': 'New International Version',
        'NKJV': 'New King James Version',
        'NLT': 'New Living Translation',
        'NASB': 'New American Standard Bible',
        'CSB': 'Christian Standard Bible',
        'MSG': 'The Message',
        'AMP': 'Amplified Bible',
        'NRSV': 'New Revised Standard Version',
    }
    return version_names.get(version_code.upper(), version_code)

def validate_bible_data(bible_data, version_code):
    """Validate parsed Bible data."""
    print(f"\n📊 Validating {version_code} data:")
    
    total_chapters = sum(len(chapters) for chapters in bible_data.values())
    total_verses = sum(
        len(verses) 
        for chapters in bible_data.values() 
        for verses in chapters.values()
    )
    
    print(f"  Books: {len(bible_data)}")
    print(f"  Chapters: {total_chapters}")
    print(f"  Verses: {total_verses}")
    
    if len(bible_data) < 66:
        print(f"  ⚠️  Warning: Expected 66 books, found {len(bible_data)}")
    
    return True

def process_version(input_file, version_code):
    """Process a single Bible version."""
    print(f"\n🔄 Processing {version_code} from {input_file}")
    
    if not os.path.exists(input_file):
        print(f"❌ File not found: {input_file}")
        return False
    
    try:
        # Parse the JSON
        bible_data = parse_user_bible_json(input_file)
        
        # Validate
        validate_bible_data(bible_data, version_code)
        
        # Generate output
        output_dir = f"../data/{version_code.lower()}"
        generate_data_files(bible_data, output_dir, version_code)
        
        return True
        
    except Exception as e:
        print(f"❌ Error processing {version_code}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Process all Bible versions."""
    print("📚 Processing Bible Versions for Bible Type App")
    print("=" * 50)
    
    # Define the versions to process
    versions = [
        ("c:/Users/usstgc/Downloads/ESV_bible.json", "ESV"),
        ("c:/Users/usstgc/Downloads/NLT_bible.json", "NLT"), 
        ("c:/Users/usstgc/Downloads/NIV_bible.json", "NIV"),
        ("c:/Users/usstgc/Downloads/NASB_bible.json", "NASB"),
        # Add KJV when you have it
        # ("c:/Users/usstgc/Downloads/KJV_bible.json", "KJV"),
    ]
    
    success_count = 0
    for input_file, version_code in versions:
        if process_version(input_file, version_code):
            success_count += 1
    
    print(f"\n✨ Processing Complete!")
    print(f"✅ Successfully processed: {success_count}/{len(versions)} versions")
    print(f"📁 Data created in: ../data/")
    
    if success_count > 0:
        print(f"\n🎮 To use:")
        print(f"  1. Start your app: python -m http.server 8000")
        print(f"  2. Open: http://localhost:8000")
        print(f"  3. Go to Settings ⚙️ → Bible Version")
        print(f"  4. Select your preferred version!")

if __name__ == '__main__':
    main()