#!/usr/bin/env python3
"""
Process Bible JSON files for multiple versions.

This script takes a Bible JSON file and generates chapter data files
organized by version, book, and chapter.

Usage:
    python process_bible_json.py <input_bible_json> <output_directory> --version <VERSION_CODE>

Example:
    python process_bible_json.py ESV_bible.json data/esv --version ESV
    python process_bible_json.py KJV_bible.json data/kjv --version KJV

Expected Input JSON Format (flexible):
[
    {
        "book": "Genesis",
        "chapters": [
            {
                "chapter": 1,
                "verses": ["In the beginning...", "And the earth..."]
            }
        ]
    }
]

OR:

{
    "books": [
        {
            "name": "Genesis",
            "chapters": [
                {
                    "number": 1,
                    "verses": ["In the beginning...", "And the earth..."]
                }
            ]
        }
    ]
}
"""

import json
import os
import sys
import argparse
import re
from pathlib import Path


# Canonical book name mapping (handles variations)
BOOK_NAME_MAP = {
    'genesis': 'genesis',
    'gen': 'genesis',
    'exodus': 'exodus',
    'exo': 'exodus',
    'leviticus': 'leviticus',
    'lev': 'leviticus',
    'numbers': 'numbers',
    'num': 'numbers',
    'deuteronomy': 'deuteronomy',
    'deu': 'deuteronomy',
    'deut': 'deuteronomy',
    'joshua': 'joshua',
    'jos': 'joshua',
    'josh': 'joshua',
    'judges': 'judges',
    'jdg': 'judges',
    'judg': 'judges',
    'ruth': 'ruth',
    'rut': 'ruth',
    '1 samuel': '1_samuel',
    '1samuel': '1_samuel',
    '1sam': '1_samuel',
    '1 sam': '1_samuel',
    '2 samuel': '2_samuel',
    '2samuel': '2_samuel',
    '2sam': '2_samuel',
    '2 sam': '2_samuel',
    '1 kings': '1_kings',
    '1kings': '1_kings',
    '1ki': '1_kings',
    '1 ki': '1_kings',
    '2 kings': '2_kings',
    '2kings': '2_kings',
    '2ki': '2_kings',
    '2 ki': '2_kings',
    '1 chronicles': '1_chronicles',
    '1chronicles': '1_chronicles',
    '1ch': '1_chronicles',
    '1 ch': '1_chronicles',
    '2 chronicles': '2_chronicles',
    '2chronicles': '2_chronicles',
    '2ch': '2_chronicles',
    '2 ch': '2_chronicles',
    'ezra': 'ezra',
    'ezr': 'ezra',
    'nehemiah': 'nehemiah',
    'neh': 'nehemiah',
    'esther': 'esther',
    'est': 'esther',
    'job': 'job',
    'psalms': 'psalms',
    'psalm': 'psalms',
    'psa': 'psalms',
    'ps': 'psalms',
    'proverbs': 'proverbs',
    'pro': 'proverbs',
    'prov': 'proverbs',
    'ecclesiastes': 'ecclesiastes',
    'ecc': 'ecclesiastes',
    'eccl': 'ecclesiastes',
    'song of solomon': 'song_of_solomon',
    'song of songs': 'song_of_solomon',
    'song': 'song_of_solomon',
    'sos': 'song_of_solomon',
    'isaiah': 'isaiah',
    'isa': 'isaiah',
    'jeremiah': 'jeremiah',
    'jer': 'jeremiah',
    'lamentations': 'lamentations',
    'lam': 'lamentations',
    'ezekiel': 'ezekiel',
    'eze': 'ezekiel',
    'ezek': 'ezekiel',
    'daniel': 'daniel',
    'dan': 'daniel',
    'hosea': 'hosea',
    'hos': 'hosea',
    'joel': 'joel',
    'joe': 'joel',
    'amos': 'amos',
    'amo': 'amos',
    'obadiah': 'obadiah',
    'oba': 'obadiah',
    'jonah': 'jonah',
    'jon': 'jonah',
    'micah': 'micah',
    'mic': 'micah',
    'nahum': 'nahum',
    'nah': 'nahum',
    'habakkuk': 'habakkuk',
    'hab': 'habakkuk',
    'zephaniah': 'zephaniah',
    'zep': 'zephaniah',
    'zeph': 'zephaniah',
    'haggai': 'haggai',
    'hag': 'haggai',
    'zechariah': 'zechariah',
    'zec': 'zechariah',
    'zech': 'zechariah',
    'malachi': 'malachi',
    'mal': 'malachi',
    'matthew': 'matthew',
    'mat': 'matthew',
    'matt': 'matthew',
    'mark': 'mark',
    'mar': 'mark',
    'mk': 'mark',
    'luke': 'luke',
    'luk': 'luke',
    'lk': 'luke',
    'john': 'john',
    'joh': 'john',
    'jn': 'john',
    'acts': 'acts',
    'act': 'acts',
    'romans': 'romans',
    'rom': 'romans',
    '1 corinthians': '1_corinthians',
    '1corinthians': '1_corinthians',
    '1cor': '1_corinthians',
    '1 cor': '1_corinthians',
    '2 corinthians': '2_corinthians',
    '2corinthians': '2_corinthians',
    '2cor': '2_corinthians',
    '2 cor': '2_corinthians',
    'galatians': 'galatians',
    'gal': 'galatians',
    'ephesians': 'ephesians',
    'eph': 'ephesians',
    'philippians': 'philippians',
    'phi': 'philippians',
    'phil': 'philippians',
    'colossians': 'colossians',
    'col': 'colossians',
    '1 thessalonians': '1_thessalonians',
    '1thessalonians': '1_thessalonians',
    '1th': '1_thessalonians',
    '1 th': '1_thessalonians',
    '2 thessalonians': '2_thessalonians',
    '2thessalonians': '2_thessalonians',
    '2th': '2_thessalonians',
    '2 th': '2_thessalonians',
    '1 timothy': '1_timothy',
    '1timothy': '1_timothy',
    '1ti': '1_timothy',
    '1 ti': '1_timothy',
    '2 timothy': '2_timothy',
    '2timothy': '2_timothy',
    '2ti': '2_timothy',
    '2 ti': '2_timothy',
    'titus': 'titus',
    'tit': 'titus',
    'philemon': 'philemon',
    'phm': 'philemon',
    'phlm': 'philemon',
    'hebrews': 'hebrews',
    'heb': 'hebrews',
    'james': 'james',
    'jas': 'james',
    'jam': 'james',
    '1 peter': '1_peter',
    '1peter': '1_peter',
    '1pe': '1_peter',
    '1 pe': '1_peter',
    '2 peter': '2_peter',
    '2peter': '2_peter',
    '2pe': '2_peter',
    '2 pe': '2_peter',
    '1 john': '1_john',
    '1john': '1_john',
    '1jo': '1_john',
    '1 jo': '1_john',
    '2 john': '2_john',
    '2john': '2_john',
    '2jo': '2_john',
    '2 jo': '2_john',
    '3 john': '3_john',
    '3john': '3_john',
    '3jo': '3_john',
    '3 jo': '3_john',
    'jude': 'jude',
    'jud': 'jude',
    'revelation': 'revelation',
    'rev': 'revelation',
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
    """Clean verse text by removing verse numbers and extra whitespace."""
    # Remove leading verse numbers (e.g., "1 In the beginning" -> "In the beginning")
    cleaned = re.sub(r'^\d+\s+', '', verse_text)
    
    # Remove multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    return cleaned.strip()


def parse_bible_json(input_file):
    """
    Parse Bible JSON file with flexible format support.
    Returns: dict with structure {book_name: {chapter_num: [verses]}}
    """
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    bible_data = {}
    
    # Handle different JSON formats
    if isinstance(data, list):
        # Format 1: List of books at root level
        books = data
    elif isinstance(data, dict):
        # Format 2: Object with 'books' key
        if 'books' in data:
            books = data['books']
        elif 'bible' in data:
            books = data['bible']
        else:
            # Assume the dict values are books
            books = list(data.values())
    else:
        raise ValueError("Unrecognized Bible JSON format")
    
    for book in books:
        # Extract book name (handle different keys)
        book_name = book.get('book') or book.get('name') or book.get('bookName')
        if not book_name:
            print(f"Warning: Skipping book with no name: {book}")
            continue
        
        normalized_name = normalize_book_name(book_name)
        bible_data[normalized_name] = {}
        
        # Extract chapters (handle different keys)
        chapters = book.get('chapters') or book.get('chapter') or []
        if not isinstance(chapters, list):
            chapters = [chapters]
        
        for chapter in chapters:
            # Extract chapter number
            chapter_num = (
                chapter.get('chapter') or 
                chapter.get('number') or 
                chapter.get('chapterNumber') or 
                chapter.get('id')
            )
            
            if chapter_num is None:
                print(f"Warning: Skipping chapter with no number in {book_name}")
                continue
            
            chapter_num = int(chapter_num)
            
            # Extract verses
            verses = chapter.get('verses') or chapter.get('verse') or []
            if not isinstance(verses, list):
                verses = [verses]
            
            # Clean verses
            cleaned_verses = [clean_verse_text(v) for v in verses if v]
            
            if cleaned_verses:
                bible_data[normalized_name][chapter_num] = cleaned_verses
    
    return bible_data


def generate_data_files(bible_data, output_dir, version_code):
    """
    Generate data files from parsed Bible data.
    
    Args:
        bible_data: dict with structure {book_name: {chapter_num: [verses]}}
        output_dir: base output directory (e.g., 'data/esv')
        version_code: version identifier (e.g., 'ESV')
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Create version metadata file
    version_metadata = {
        'version': version_code,
        'name': get_version_full_name(version_code),
        'books': len(bible_data),
        'total_chapters': sum(len(chapters) for chapters in bible_data.values()),
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
            print(f"Created: {chapter_file} ({len(verses)} verses)")
    
    print(f"\n✅ Successfully created {total_files} chapter files for {version_code}")
    print(f"📁 Output directory: {output_dir}")
    
    return total_files


def get_version_full_name(version_code):
    """Get full name of Bible version from code."""
    version_names = {
        'KJV': 'King James Version',
        'ESV': 'English Standard Version',
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
    """Validate parsed Bible data for completeness."""
    print(f"\n📊 Validating {version_code} data...")
    
    expected_books = 66
    total_chapters = sum(len(chapters) for chapters in bible_data.values())
    total_verses = sum(
        len(verses) 
        for chapters in bible_data.values() 
        for verses in chapters.values()
    )
    
    print(f"  Books found: {len(bible_data)} (expected: {expected_books})")
    print(f"  Total chapters: {total_chapters}")
    print(f"  Total verses: {total_verses}")
    
    if len(bible_data) < expected_books:
        print(f"  ⚠️  Warning: Expected {expected_books} books, found {len(bible_data)}")
        missing_books = []
        # Could add logic to detect which books are missing
    
    if total_chapters < 1189:
        print(f"  ⚠️  Warning: Expected ~1,189 chapters, found {total_chapters}")
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Process Bible JSON files for multiple versions',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python process_bible_json.py esv_bible.json data/esv --version ESV
  python process_bible_json.py kjv_bible.json data/kjv --version KJV
        """
    )
    
    parser.add_argument('input_file', help='Input Bible JSON file')
    parser.add_argument('output_dir', help='Output directory for generated files')
    parser.add_argument('--version', '-v', required=True, 
                       help='Bible version code (e.g., ESV, KJV, NIV)')
    parser.add_argument('--validate', action='store_true',
                       help='Validate data after parsing')
    
    args = parser.parse_args()
    
    # Check input file exists
    if not os.path.exists(args.input_file):
        print(f"❌ Error: Input file not found: {args.input_file}")
        sys.exit(1)
    
    print(f"🔄 Processing {args.version} Bible from: {args.input_file}")
    print(f"📁 Output directory: {args.output_dir}")
    
    try:
        # Parse Bible JSON
        bible_data = parse_bible_json(args.input_file)
        
        # Validate if requested
        if args.validate:
            validate_bible_data(bible_data, args.version)
        
        # Generate data files
        generate_data_files(bible_data, args.output_dir, args.version)
        
        print(f"\n✨ {args.version} Bible processing complete!")
        
    except Exception as e:
        print(f"\n❌ Error processing Bible data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
