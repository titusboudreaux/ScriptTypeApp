#!/usr/bin/env python3
"""
Generate sample Bible chapter data from a JSON source.

This script generates sample data files for the Bible Type app.
You should replace this with actual Bible text data from a reliable source.

Usage:
    python3 generate_data.py <input_bible_json> <output_directory>

Example input JSON format:
[
    {
        "book": "Genesis",
        "chapters": [
            {
                "number": 1,
                "verses": ["In the beginning...", "Now the earth was..."]
            }
        ]
    }
]
"""

import json
import os
import sys

def generate_data(input_file, output_dir):
    """Generate Bible data files from input JSON."""
    
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found")
        sys.exit(1)

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            bible_data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        sys.exit(1)

    for book in bible_data:
        book_name = book.get('book', '').lower().replace(' ', '_')
        book_dir = os.path.join(output_dir, book_name)
        
        os.makedirs(book_dir, exist_ok=True)
        
        for chapter in book.get('chapters', []):
            chapter_num = chapter.get('number', 0)
            verses = chapter.get('verses', [])
            
            if not verses:
                continue
            
            output_file = os.path.join(book_dir, f'{chapter_num}.json')
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(verses, f, ensure_ascii=False, indent=2)
            
            print(f"Created: {output_file}")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 generate_data.py <input_bible_json> <output_directory>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    
    generate_data(input_file, output_dir)
    print("Data generation complete!")
