#!/usr/bin/env python3
"""
Generates the Bible structure as SQL seed files with ALL verses (31,102 verses)
Uses OSIS standardized abbreviations for human-readable IDs
"""

import os
import sys

# Expected correct counts for Protestant Bible
EXPECTED_TOTALS = {
    'books': 66,
    'chapters': 1189,
    'verses': 31102
}

# Mapping from internal book names to OSIS standardized abbreviations
BOOK_NAME_TO_OSIS = {
    'genesis': 'Gen', 'exodus': 'Exod', 'leviticus': 'Lev', 'numbers': 'Num', 'deuteronomy': 'Deut',
    'joshua': 'Josh', 'judges': 'Judg', 'ruth': 'Ruth', '1_samuel': '1Sam', '2_samuel': '2Sam',
    '1_kings': '1Kgs', '2_kings': '2Kgs', '1_chronicles': '1Chr', '2_chronicles': '2Chr',
    'ezra': 'Ezra', 'nehemiah': 'Neh', 'esther': 'Esth', 'job': 'Job', 'psalms': 'Ps',
    'proverbs': 'Prov', 'ecclesiastes': 'Eccl', 'song_of_songs': 'Song', 'isaiah': 'Isa',
    'jeremiah': 'Jer', 'lamentations': 'Lam', 'ezekiel': 'Ezek', 'daniel': 'Dan',
    'hosea': 'Hos', 'joel': 'Joel', 'amos': 'Amos', 'obadiah': 'Obad', 'jonah': 'Jonah',
    'micah': 'Mic', 'nahum': 'Nah', 'habakkuk': 'Hab', 'zephaniah': 'Zeph', 'haggai': 'Hag',
    'zechariah': 'Zech', 'malachi': 'Mal',
    'matthew': 'Matt', 'mark': 'Mark', 'luke': 'Luke', 'john': 'John', 'acts': 'Acts',
    'romans': 'Rom', '1_corinthians': '1Cor', '2_corinthians': '2Cor', 'galatians': 'Gal',
    'ephesians': 'Eph', 'philippians': 'Phil', 'colossians': 'Col', '1_thessalonians': '1Thess',
    '2_thessalonians': '2Thess', '1_timothy': '1Tim', '2_timothy': '2Tim', 'titus': 'Titus',
    'philemon': 'Phlm', 'hebrews': 'Heb', 'james': 'Jas', '1_peter': '1Pet', '2_peter': '2Pet',
    '1_john': '1John', '2_john': '2John', '3_john': '3John', 'jude': 'Jude', 'revelation': 'Rev'
}

# Known correct chapter counts for Protestant Bible (for verification)
CORRECT_CHAPTER_COUNTS = {
    # Old Testament
    'genesis': 50, 'exodus': 40, 'leviticus': 27, 'numbers': 36, 'deuteronomy': 34,
    'joshua': 24, 'judges': 21, 'ruth': 4, '1_samuel': 31, '2_samuel': 24,
    '1_kings': 22, '2_kings': 25, '1_chronicles': 29, '2_chronicles': 36,
    'ezra': 10, 'nehemiah': 13, 'esther': 10, 'job': 42, 'psalms': 150,
    'proverbs': 31, 'ecclesiastes': 12, 'song_of_songs': 8, 'isaiah': 66,
    'jeremiah': 52, 'lamentations': 5, 'ezekiel': 48, 'daniel': 12,
    'hosea': 14, 'joel': 3, 'amos': 9, 'obadiah': 1, 'jonah': 4,
    'micah': 7, 'nahum': 3, 'habakkuk': 3, 'zephaniah': 3, 'haggai': 2,
    'zechariah': 14, 'malachi': 4,
    # New Testament
    'matthew': 28, 'mark': 16, 'luke': 24, 'john': 21, 'acts': 28,
    'romans': 16, '1_corinthians': 16, '2_corinthians': 13, 'galatians': 6,
    'ephesians': 6, 'philippians': 4, 'colossians': 4, '1_thessalonians': 5,
    '2_thessalonians': 3, '1_timothy': 6, '2_timothy': 4, 'titus': 3,
    'philemon': 1, 'hebrews': 13, 'james': 5, '1_peter': 5, '2_peter': 3,
    '1_john': 5, '2_john': 1, '3_john': 1, 'jude': 1, 'revelation': 22
}

# Complete Protestant Bible structure with exact chapter and verse counts
PROTESTANT_BIBLE = [
    # Old Testament (39 books)
    {"name": "genesis", "book_number": 1, "chapters": [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26]},
    {"name": "exodus", "book_number": 2, "chapters": [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38]},
    {"name": "leviticus", "book_number": 3, "chapters": [17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34]},
    {"name": "numbers", "book_number": 4, "chapters": [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13]},
    {"name": "deuteronomy", "book_number": 5, "chapters": [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12]},
    {"name": "joshua", "book_number": 6, "chapters": [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33]},
    {"name": "judges", "book_number": 7, "chapters": [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25]},
    {"name": "ruth", "book_number": 8, "chapters": [22,23,18,22]},
    {"name": "1_samuel", "book_number": 9, "chapters": [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13]},
    {"name": "2_samuel", "book_number": 10, "chapters": [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25]},
    {"name": "1_kings", "book_number": 11, "chapters": [53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53]},
    {"name": "2_kings", "book_number": 12, "chapters": [18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30]},
    {"name": "1_chronicles", "book_number": 13, "chapters": [54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30]},
    {"name": "2_chronicles", "book_number": 14, "chapters": [17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23]},
    {"name": "ezra", "book_number": 15, "chapters": [11,70,13,24,17,22,28,36,15,44]},
    {"name": "nehemiah", "book_number": 16, "chapters": [11,20,32,23,19,19,73,18,38,39,36,47,31]},
    {"name": "esther", "book_number": 17, "chapters": [22,23,15,17,14,14,10,17,32,3]},
    {"name": "job", "book_number": 18, "chapters": [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17]},
    {"name": "psalms", "book_number": 19, "chapters": [6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6]},
    {"name": "proverbs", "book_number": 20, "chapters": [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31]},
    {"name": "ecclesiastes", "book_number": 21, "chapters": [18,26,22,16,20,12,29,17,18,20,10,14]},
    {"name": "song_of_songs", "book_number": 22, "chapters": [17,17,11,16,16,13,13,14]},
    {"name": "isaiah", "book_number": 23, "chapters": [31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24]},
    {"name": "jeremiah", "book_number": 24, "chapters": [19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34]},
    {"name": "lamentations", "book_number": 25, "chapters": [22,22,66,22,22]},
    {"name": "ezekiel", "book_number": 26, "chapters": [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35]},
    {"name": "daniel", "book_number": 27, "chapters": [21,49,30,37,31,28,28,27,27,21,45,13]},
    {"name": "hosea", "book_number": 28, "chapters": [11,23,5,19,15,11,16,14,17,15,12,14,16,9]},
    {"name": "joel", "book_number": 29, "chapters": [20,32,21]},
    {"name": "amos", "book_number": 30, "chapters": [15,16,15,13,27,14,17,14,15]},
    {"name": "obadiah", "book_number": 31, "chapters": [21]},
    {"name": "jonah", "book_number": 32, "chapters": [17,10,10,11]},
    {"name": "micah", "book_number": 33, "chapters": [16,13,12,13,15,16,20]},
    {"name": "nahum", "book_number": 34, "chapters": [15,13,19]},
    {"name": "habakkuk", "book_number": 35, "chapters": [17,20,19]},
    {"name": "zephaniah", "book_number": 36, "chapters": [18,15,20]},
    {"name": "haggai", "book_number": 37, "chapters": [15,23]},
    {"name": "zechariah", "book_number": 38, "chapters": [21,13,10,14,11,15,14,23,17,12,17,14,9,21]},
    {"name": "malachi", "book_number": 39, "chapters": [14,17,18,6]},
    
    # New Testament (27 books)
    {"name": "matthew", "book_number": 40, "chapters": [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20]},
    {"name": "mark", "book_number": 41, "chapters": [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20]},
    {"name": "luke", "book_number": 42, "chapters": [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53]},
    {"name": "john", "book_number": 43, "chapters": [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25]},
    {"name": "acts", "book_number": 44, "chapters": [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31]},
    {"name": "romans", "book_number": 45, "chapters": [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27]},
    {"name": "1_corinthians", "book_number": 46, "chapters": [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24]},
    {"name": "2_corinthians", "book_number": 47, "chapters": [24,17,18,18,21,18,16,24,15,18,33,21,14]},
    {"name": "galatians", "book_number": 48, "chapters": [24,21,29,31,26,18]},
    {"name": "ephesians", "book_number": 49, "chapters": [23,22,21,32,33,24]},
    {"name": "philippians", "book_number": 50, "chapters": [30,30,21,23]},
    {"name": "colossians", "book_number": 51, "chapters": [29,23,25,18]},
    {"name": "1_thessalonians", "book_number": 52, "chapters": [10,20,13,18,28]},
    {"name": "2_thessalonians", "book_number": 53, "chapters": [12,17,18]},
    {"name": "1_timothy", "book_number": 54, "chapters": [20,15,16,16,25,21]},
    {"name": "2_timothy", "book_number": 55, "chapters": [18,26,17,22]},
    {"name": "titus", "book_number": 56, "chapters": [16,15,15]},
    {"name": "philemon", "book_number": 57, "chapters": [25]},
    {"name": "hebrews", "book_number": 58, "chapters": [14,18,19,16,14,20,28,13,28,39,40,29,25]},
    {"name": "james", "book_number": 59, "chapters": [27,26,18,17,20]},
    {"name": "1_peter", "book_number": 60, "chapters": [25,25,22,19,14]},
    {"name": "2_peter", "book_number": 61, "chapters": [21,22,18]},
    {"name": "1_john", "book_number": 62, "chapters": [10,29,24,21,21]},
    {"name": "2_john", "book_number": 63, "chapters": [13]},
    {"name": "3_john", "book_number": 64, "chapters": [14]},
    {"name": "jude", "book_number": 65, "chapters": [25]},
    {"name": "revelation", "book_number": 66, "chapters": [20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21]}
]

def get_stats():
    """Calculate and return statistics"""
    total_books = len(PROTESTANT_BIBLE)
    total_chapters = sum(len(book['chapters']) for book in PROTESTANT_BIBLE)
    total_verses = sum(sum(book['chapters']) for book in PROTESTANT_BIBLE)
    
    return {
        'books': total_books,
        'chapters': total_chapters,
        'verses': total_verses
    }

def debug_bible_structure():
    """Debug the Bible structure to find discrepancies"""
    print("\n🔍 DEBUGGING BIBLE STRUCTURE")
    print("=" * 60)
    
    stats = get_stats()
    print(f"Current data: {stats['books']} books, {stats['chapters']} chapters, {stats['verses']} verses")
    print(f"Expected:     {EXPECTED_TOTALS['books']} books, {EXPECTED_TOTALS['chapters']} chapters, {EXPECTED_TOTALS['verses']} verses")
    print()
    
    # Check discrepancies
    chapter_diff = stats['chapters'] - EXPECTED_TOTALS['chapters']
    verse_diff = stats['verses'] - EXPECTED_TOTALS['verses']
    
    if chapter_diff != 0:
        print(f"❌ CHAPTER DISCREPANCY: {chapter_diff:+d} chapters")
    if verse_diff != 0:
        print(f"❌ VERSE DISCREPANCY: {verse_diff:+d} verses")
    
    print("\n📊 BOOK-BY-BOOK ANALYSIS:")
    print("-" * 80)
    print(f"{'Status':<2} {'Book':<15} {'Testament':<13} {'Chapters':<12} {'Expected':<10} {'Verses':<8}")
    print("-" * 80)
    
    errors = []
    old_testament_chapters = 0
    new_testament_chapters = 0
    
    for book in PROTESTANT_BIBLE:
        book_name = book['name']
        actual_chapters = len(book['chapters'])
        expected_chapters = CORRECT_CHAPTER_COUNTS.get(book_name, -1)
        testament = "old" if book['book_number'] <= 39 else "new"
        testament_display = "Old Testament" if book['book_number'] <= 39 else "New Testament"
        
        if book['book_number'] <= 39:  # Old Testament
            old_testament_chapters += actual_chapters
        else:  # New Testament
            new_testament_chapters += actual_chapters
        
        status = "✅" if actual_chapters == expected_chapters else "❌"
        
        if actual_chapters != expected_chapters:
            errors.append({
                'book': book_name,
                'actual': actual_chapters,
                'expected': expected_chapters,
                'diff': actual_chapters - expected_chapters
            })
        
        print(f"{status} {book_name:<15} {testament_display:<13} {actual_chapters:>3}/{expected_chapters:<3}      {sum(book['chapters']):>5}")
    
    print("-" * 80)
    print(f"Old Testament: {old_testament_chapters} chapters")
    print(f"New Testament: {new_testament_chapters} chapters")
    print(f"Total: {old_testament_chapters + new_testament_chapters} chapters")
    
    if errors:
        print(f"\n❌ FOUND {len(errors)} ERRORS:")
        print("-" * 40)
        for error in errors:
            print(f"  {error['book']}: {error['actual']} chapters (expected {error['expected']}, diff: {error['diff']:+d})")
    else:
        print("\n✅ All chapter counts are correct!")
    
    return errors

def verify_individual_books():
    """Verify specific books that might have errors"""
    print("\n🔍 DETAILED BOOK VERIFICATION")
    print("=" * 60)
    
    # Check some commonly problematic books
    problematic_books = ['psalms', 'jeremiah', 'ezekiel', 'matthew', 'luke']
    
    for book_name in problematic_books:
        book = next((b for b in PROTESTANT_BIBLE if b['name'] == book_name), None)
        if book:
            print(f"\n📖 {book_name.upper()}:")
            print(f"   Chapters: {len(book['chapters'])}")
            print(f"   Verses: {sum(book['chapters'])}")
            print(f"   First 10 chapter verse counts: {book['chapters'][:10]}")
            if len(book['chapters']) > 10:
                print(f"   Last 10 chapter verse counts: {book['chapters'][-10:]}")

def generate_single_file():
    """Generate single large SQL file with ALL verses"""
    
    sql_parts = []
    
    # Header
    sql_parts.append("-- COMPLETE PROTESTANT BIBLE DATA WITH ALL VERSES")
    sql_parts.append("-- Generated automatically - contains all 66 books, 1189 chapters, 31102 verses")
    sql_parts.append("-- WARNING: This is a very large file!")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("")
    
    # Bible Version
    sql_parts.append("-- Bible version")
    sql_parts.append("INSERT INTO bible_versions (id, name, structure_notes)")
    sql_parts.append("VALUES ('bible-version-protestant-standard', 'Protestant Bible (Standard)', 'Standard Protestant Bible with 66 books (39 Old Testament, 27 New Testament)');")
    sql_parts.append("")
    
    # Books
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- ALL BOOKS (66 books)")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("INSERT INTO books (id, name, book_number, testament, bible_version_id)")
    sql_parts.append("VALUES")
    
    book_values = []
    for book in PROTESTANT_BIBLE:
        book_id = BOOK_NAME_TO_OSIS[book['name']].lower()
        testament = "old" if book['book_number'] <= 39 else "new"
        book_values.append(f"  ('{book_id}', '{book['name'].replace('_', ' ').title()}', {book['book_number']}, '{testament}', 'bible-version-protestant-standard')")
    
    sql_parts.append(",\n".join(book_values) + ";")
    sql_parts.append("")
    
    # Chapters
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- ALL CHAPTERS (1,189 chapters)")
    sql_parts.append("-- ============================================================================")
    
    for book in PROTESTANT_BIBLE:
        book_id = BOOK_NAME_TO_OSIS[book['name']].lower()
        book_name = book['name'].replace('_', ' ').title()
        chapter_count = len(book['chapters'])
        
        sql_parts.append(f"-- {book_name.upper()} ({chapter_count} chapters)")
        sql_parts.append("INSERT INTO chapters (id, book_id, chapter_number, total_verses)")
        sql_parts.append("VALUES")
        
        chapter_values = []
        for chapter_num, verse_count in enumerate(book['chapters'], 1):
            chapter_id = f"{BOOK_NAME_TO_OSIS[book['name']].lower()}-{chapter_num}"
            chapter_values.append(f"  ('{chapter_id}', '{book_id}', {chapter_num}, {verse_count})")
        
        sql_parts.append(",\n".join(chapter_values) + ";")
        sql_parts.append("")
    
    # ALL VERSES - Complete generation
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- ALL VERSES (31,102 verses)")
    sql_parts.append("-- ============================================================================")
    
    verse_count = 0
    for book in PROTESTANT_BIBLE:
        book_name = book['name'].replace('_', ' ').title()
        
        for chapter_num, chapter_verse_count in enumerate(book['chapters'], 1):
            chapter_id = f"{BOOK_NAME_TO_OSIS[book['name']].lower()}-{chapter_num}"
            
            sql_parts.append(f"-- {book_name.upper()} CHAPTER {chapter_num} ({chapter_verse_count} verses)")
            sql_parts.append("INSERT INTO verses (id, chapter_id, verse_number)")
            sql_parts.append("VALUES")
            
            verse_values = []
            for verse_num in range(1, chapter_verse_count + 1):
                verse_id = f"{BOOK_NAME_TO_OSIS[book['name']].lower()}-{chapter_num}-{verse_num}"
                verse_values.append(f"  ('{verse_id}', '{chapter_id}', {verse_num})")
                verse_count += 1
            
            sql_parts.append(",\n".join(verse_values) + ";")
            sql_parts.append("")
            
            # Progress indicator
            if verse_count % 1000 == 0:
                print(f"Generated {verse_count:,} verses...")
    
    # Footer
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- REFRESH GLOBAL ORDER VALUES")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- Call this function after all data is loaded to populate the global_order columns")
    sql_parts.append("SELECT refresh_all_global_orders();")
    
    return "\n".join(sql_parts)

def generate_chunked_files(verses_per_file=5000):
    """Generate multiple smaller files for easier processing"""
    
    print(f"Generating Bible data in chunks of {verses_per_file:,} verses each...")
    
    # Create directory
    output_dir = "./supabase/seed/03_bible_chunks"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate bible version and books first
    with open(f"{output_dir}/01_bible_version_books.sql", "w") as f:
        f.write("-- Bible Version and Books\n")
        f.write("INSERT INTO bible_versions (id, name, structure_notes)\n")
        f.write("VALUES ('bible-version-protestant-standard', 'Protestant Bible (Standard)', 'Standard Protestant Bible with 66 books (39 Old Testament, 27 New Testament)');\n\n")
        
        f.write("-- All Books\n")
        f.write("INSERT INTO books (id, name, book_number, testament, bible_version_id)\nVALUES\n")
        book_values = []
        for book in PROTESTANT_BIBLE:
            book_id = BOOK_NAME_TO_OSIS[book['name']].lower()
            testament = "old" if book['book_number'] <= 39 else "new"
            book_values.append(f"  ('{book_id}', '{book['name'].replace('_', ' ').title()}', {book['book_number']}, '{testament}', 'bible-version-protestant-standard')")
        f.write(",\n".join(book_values) + ";\n")
    
    # Generate all chapters
    with open(f"{output_dir}/02_all_chapters.sql", "w") as f:
        f.write("-- All Chapters\n")
        for book in PROTESTANT_BIBLE:
            book_id = BOOK_NAME_TO_OSIS[book['name']].lower()
            book_name = book['name'].replace('_', ' ').title()
            
            f.write(f"-- {book_name.upper()}\n")
            f.write("INSERT INTO chapters (id, book_id, chapter_number, total_verses)\nVALUES\n")
            
            chapter_values = []
            for chapter_num, verse_count in enumerate(book['chapters'], 1):
                chapter_id = f"{BOOK_NAME_TO_OSIS[book['name']].lower()}-{chapter_num}"
                chapter_values.append(f"  ('{chapter_id}', '{book_id}', {chapter_num}, {verse_count})")
            
            f.write(",\n".join(chapter_values) + ";\n\n")
    
    # Generate verses in chunks
    verse_count = 0
    file_count = 3
    current_file = None
    
    current_insert_verses = []
    
    for book in PROTESTANT_BIBLE:
        for chapter_num, chapter_verse_count in enumerate(book['chapters'], 1):
            chapter_id = f"{BOOK_NAME_TO_OSIS[book['name']].lower()}-{chapter_num}"
            book_name = book['name'].replace('_', ' ').title()
            
            for verse_num in range(1, chapter_verse_count + 1):
                # Check if we need a new file
                if current_file is None or verse_count % verses_per_file == 0:
                    # Close previous file if it exists
                    if current_file is not None:
                        if current_insert_verses:
                            current_file.write(",\n".join(current_insert_verses) + ";\n\n")
                        current_file.close()
                    
                    # Open new file
                    start_verse = verse_count + 1
                    end_verse = min(verses_per_file + verse_count, EXPECTED_TOTALS['verses'])
                    current_file = open(f"{output_dir}/{file_count:02d}_verses_{start_verse:06d}_{end_verse:06d}.sql", "w")
                    current_file.write(f"-- Verses {start_verse:,} to {end_verse:,}\n\n")
                    current_file.write("INSERT INTO verses (id, chapter_id, verse_number)\nVALUES\n")
                    file_count += 1
                    current_insert_verses = []
                
                verse_id = f"{BOOK_NAME_TO_OSIS[book['name']].lower()}-{chapter_num}-{verse_num}"
                current_insert_verses.append(f"  ('{verse_id}', '{chapter_id}', {verse_num})")
                verse_count += 1
                
                if verse_count % 1000 == 0:
                    print(f"Generated {verse_count:,} verses...")
    
    # Close the final file and complete the last INSERT statement
    if current_file and current_insert_verses:
        current_file.write(",\n".join(current_insert_verses) + ";\n")
        current_file.close()
    
    # Create final refresh file
    with open(f"{output_dir}/99_refresh_global_orders.sql", "w") as f:
        f.write("-- Refresh global order values\n")
        f.write("SELECT refresh_all_global_orders();\n")
    
    print(f"✅ Generated {verse_count:,} verses in {file_count-3} chunk files")
    print(f"📁 Files saved to: {output_dir}/")

def generate_migration_sql():
    """Generate migration-friendly SQL for existing databases"""
    
    print("\n🚀 Generating migration-friendly SQL...")
    
    sql_parts = []
    
    # Header
    sql_parts.append("-- MIGRATION-FRIENDLY BIBLE DATA")
    sql_parts.append("-- Safe to run on databases with existing data")
    sql_parts.append("-- Uses UPSERT/ON CONFLICT syntax to avoid duplicates")
    sql_parts.append("-- Uses testament enum values: 'old', 'new'")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("")
    
    # Bible Version (UPSERT)
    sql_parts.append("-- Bible version (UPSERT)")
    sql_parts.append("INSERT INTO bible_versions (id, name, structure_notes)")
    sql_parts.append("VALUES ('bible-version-protestant-standard', 'Protestant Bible (Standard)', 'Standard Protestant Bible with 66 books (39 Old Testament, 27 New Testament)')")
    sql_parts.append("ON CONFLICT (id) DO UPDATE SET")
    sql_parts.append("  name = EXCLUDED.name,")
    sql_parts.append("  structure_notes = EXCLUDED.structure_notes;")
    sql_parts.append("")
    
    # Method 1: Update existing books to add testament field
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- METHOD 1: UPDATE existing books to add testament field")
    sql_parts.append("-- Run this first if your books table doesn't have testament column yet")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("")
    
    for book in PROTESTANT_BIBLE:
        book_id = BOOK_NAME_TO_OSIS[book['name']].lower()
        testament = "old" if book['book_number'] <= 39 else "new"
        sql_parts.append(f"UPDATE books SET testament = '{testament}' WHERE id = '{book_id}';")
    
    sql_parts.append("")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- METHOD 2: UPSERT books (insert new or update existing)")
    sql_parts.append("-- Use this if you want to insert/update all book data at once")
    sql_parts.append("-- ============================================================================")
    
    book_values = []
    for book in PROTESTANT_BIBLE:
        book_id = BOOK_NAME_TO_OSIS[book['name']].lower()
        testament = "old" if book['book_number'] <= 39 else "new"
        book_values.append(f"  ('{book_id}', '{book['name'].replace('_', ' ').title()}', {book['book_number']}, '{testament}', 'bible-version-protestant-standard')")
    
    sql_parts.append("INSERT INTO books (id, name, book_number, testament, bible_version_id)")
    sql_parts.append("VALUES")
    sql_parts.append(",\n".join(book_values))
    sql_parts.append("ON CONFLICT (id) DO UPDATE SET")
    sql_parts.append("  name = EXCLUDED.name,")
    sql_parts.append("  book_number = EXCLUDED.book_number,")
    sql_parts.append("  testament = EXCLUDED.testament,")
    sql_parts.append("  bible_version_id = EXCLUDED.bible_version_id;")
    sql_parts.append("")
    
    # Chapters (INSERT OR IGNORE)
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- CHAPTERS (INSERT only if not exists)")
    sql_parts.append("-- Safe to run - will skip existing chapters")
    sql_parts.append("-- ============================================================================")
    
    for book in PROTESTANT_BIBLE:
        book_id = BOOK_NAME_TO_OSIS[book['name']].lower()
        book_name = book['name'].replace('_', ' ').title()
        chapter_count = len(book['chapters'])
        
        sql_parts.append(f"-- {book_name.upper()} ({chapter_count} chapters)")
        
        chapter_values = []
        for chapter_num, verse_count in enumerate(book['chapters'], 1):
            chapter_id = f"{BOOK_NAME_TO_OSIS[book['name']].lower()}-{chapter_num}"
            chapter_values.append(f"  ('{chapter_id}', '{book_id}', {chapter_num}, {verse_count})")
        
        sql_parts.append("INSERT INTO chapters (id, book_id, chapter_number, total_verses)")
        sql_parts.append("VALUES")
        sql_parts.append(",\n".join(chapter_values))
        sql_parts.append("ON CONFLICT (id) DO NOTHING;")
        sql_parts.append("")
    
    # Verses note
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- VERSES: Use chunked files with migration syntax")
    sql_parts.append("-- This file focuses on books/chapters. For verses, modify chunked files")
    sql_parts.append("-- to use: INSERT ... ON CONFLICT (id) DO NOTHING;")
    sql_parts.append("-- ============================================================================")
    
    # Footer
    sql_parts.append("-- ============================================================================")
    sql_parts.append("-- REFRESH GLOBAL ORDER VALUES")
    sql_parts.append("-- ============================================================================")
    sql_parts.append("SELECT refresh_all_global_orders();")
    
    output_file = "supabase/seed/migration_bible_with_testament.sql"
    with open(output_file, 'w') as f:
        f.write("\n".join(sql_parts))
    
    print(f"\n✅ Generated migration-friendly SQL:")
    print(f"   📝 Safe UPSERT/UPDATE syntax")
    print(f"   📝 Uses testament enum: 'old', 'new'")
    print(f"   💾 Saved to: {output_file}")
    print(f"   📊 File size: ~{len('\n'.join(sql_parts)) // 1024:,}KB")
    print(f"\n📋 MIGRATION STEPS:")
    print(f"   1. ⚠️  BACKUP your database first!")
    print(f"   2. 🏗️  Ensure testament column exists (should be from migration)")
    print(f"   3. 🚀 Run the generated SQL file")
    print(f"   4. ✅ Existing chapters/verses will be skipped safely")
    print(f"   5. 📊 Only books will get testament field populated")

def main():
    """Main function to handle user interaction"""
    stats = get_stats()
    
    print("🔥 COMPLETE BIBLE DATA GENERATOR")
    print("=" * 50)
    print(f"📖 Books: {stats['books']}")
    print(f"📄 Chapters: {stats['chapters']}")
    print(f"📝 Verses: {stats['verses']:,}")
    print()
    
    print("Choose generation method:")
    print("1. Single large file (~15-20MB)")
    print("2. Multiple chunk files (recommended)")
    print("3. Migration-friendly SQL (for existing data)")
    print("4. Debug Bible structure")
    print("5. Verify individual books")
    print("6. Exit")
    
    choice = input("\nChoice (1/2/3/4/5/6): ").strip()
    
    if choice == "1":
        print("\n🚀 Generating single large file...")
        sql_content = generate_single_file()
        
        output_file = "supabase/seed/complete_bible_all_verses.sql"
        with open(output_file, 'w') as f:
            f.write(sql_content)
        
        print(f"\n✅ Generated complete Bible with ALL verses:")
        print(f"   📝 {stats['verses']:,} verses")
        print(f"   💾 Saved to: {output_file}")
        print(f"   📊 File size: ~{len(sql_content) // 1024:,}KB")
        
    elif choice == "2":
        print("\n🚀 Generating chunked files...")
        generate_chunked_files()
        print("\n✅ Load files in order: 01_*, 02_*, 03_*, ..., 99_*")
        
    elif choice == "3":
        generate_migration_sql()
        
    elif choice == "4":
        debug_bible_structure()
        
    elif choice == "5":
        verify_individual_books()
        
    elif choice == "6":
        print("\n👋 Goodbye!")
        sys.exit(0)
        
    else:
        print("\n❌ Invalid choice. Please run again.")
        sys.exit(1)

if __name__ == "__main__":
    main() 