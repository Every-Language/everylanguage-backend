# Bible ID Structure

This document explains the hierarchical Bible identification system used in the EverlyLanguage backend database.

## 📖 Overview

The database uses a **hierarchical TEXT ID system** based on OSIS (Open Scripture Information Standard) abbreviations. This provides human-readable, URL-friendly, and API-friendly identifiers for all Bible content.

## 🏗️ ID Structure

### Format Hierarchy

```
Books:    {osis_abbreviation}
Chapters: {osis_abbreviation}-{chapter_number}
Verses:   {osis_abbreviation}-{chapter_number}-{verse_number}
```

### Examples

| Level       | ID          | Description                                 |
| ----------- | ----------- | ------------------------------------------- |
| **Book**    | `gen`       | Book of Genesis                             |
| **Chapter** | `gen-1`     | Genesis Chapter 1                           |
| **Verse**   | `gen-1-1`   | Genesis 1:1 ("In the beginning...")         |
| **Book**    | `john`      | Gospel of John                              |
| **Chapter** | `john-3`    | John Chapter 3                              |
| **Verse**   | `john-3-16` | John 3:16 ("For God so loved the world...") |

## 📚 Complete OSIS Bible Book List

### Old Testament (39 Books)

| Book Name     | OSIS ID | Example Chapter | Example Verse |
| ------------- | ------- | --------------- | ------------- |
| Genesis       | `gen`   | `gen-1`         | `gen-1-1`     |
| Exodus        | `exod`  | `exod-20`       | `exod-20-3`   |
| Leviticus     | `lev`   | `lev-19`        | `lev-19-18`   |
| Numbers       | `num`   | `num-6`         | `num-6-24`    |
| Deuteronomy   | `deut`  | `deut-6`        | `deut-6-4`    |
| Joshua        | `josh`  | `josh-1`        | `josh-1-9`    |
| Judges        | `judg`  | `judg-6`        | `judg-6-12`   |
| Ruth          | `ruth`  | `ruth-1`        | `ruth-1-16`   |
| 1 Samuel      | `1sam`  | `1sam-17`       | `1sam-17-45`  |
| 2 Samuel      | `2sam`  | `2sam-7`        | `2sam-7-12`   |
| 1 Kings       | `1kgs`  | `1kgs-3`        | `1kgs-3-9`    |
| 2 Kings       | `2kgs`  | `2kgs-17`       | `2kgs-17-13`  |
| 1 Chronicles  | `1chr`  | `1chr-16`       | `1chr-16-11`  |
| 2 Chronicles  | `2chr`  | `2chr-7`        | `2chr-7-14`   |
| Ezra          | `ezra`  | `ezra-7`        | `ezra-7-10`   |
| Nehemiah      | `neh`   | `neh-8`         | `neh-8-10`    |
| Esther        | `esth`  | `esth-4`        | `esth-4-14`   |
| Job           | `job`   | `job-19`        | `job-19-25`   |
| Psalms        | `ps`    | `ps-23`         | `ps-23-1`     |
| Proverbs      | `prov`  | `prov-3`        | `prov-3-5`    |
| Ecclesiastes  | `eccl`  | `eccl-3`        | `eccl-3-1`    |
| Song of Songs | `song`  | `song-2`        | `song-2-10`   |
| Isaiah        | `isa`   | `isa-53`        | `isa-53-6`    |
| Jeremiah      | `jer`   | `jer-29`        | `jer-29-11`   |
| Lamentations  | `lam`   | `lam-3`         | `lam-3-22`    |
| Ezekiel       | `ezek`  | `ezek-36`       | `ezek-36-26`  |
| Daniel        | `dan`   | `dan-3`         | `dan-3-17`    |
| Hosea         | `hos`   | `hos-6`         | `hos-6-6`     |
| Joel          | `joel`  | `joel-2`        | `joel-2-28`   |
| Amos          | `amos`  | `amos-5`        | `amos-5-24`   |
| Obadiah       | `obad`  | `obad-1`        | `obad-1-15`   |
| Jonah         | `jonah` | `jonah-2`       | `jonah-2-8`   |
| Micah         | `mic`   | `mic-6`         | `mic-6-8`     |
| Nahum         | `nah`   | `nah-1`         | `nah-1-7`     |
| Habakkuk      | `hab`   | `hab-2`         | `hab-2-4`     |
| Zephaniah     | `zeph`  | `zeph-3`        | `zeph-3-17`   |
| Haggai        | `hag`   | `hag-2`         | `hag-2-9`     |
| Zechariah     | `zech`  | `zech-4`        | `zech-4-6`    |
| Malachi       | `mal`   | `mal-3`         | `mal-3-10`    |

### New Testament (27 Books)

| Book Name       | OSIS ID  | Example Chapter | Example Verse |
| --------------- | -------- | --------------- | ------------- |
| Matthew         | `matt`   | `matt-5`        | `matt-5-3`    |
| Mark            | `mark`   | `mark-16`       | `mark-16-15`  |
| Luke            | `luke`   | `luke-2`        | `luke-2-14`   |
| John            | `john`   | `john-3`        | `john-3-16`   |
| Acts            | `acts`   | `acts-1`        | `acts-1-8`    |
| Romans          | `rom`    | `rom-8`         | `rom-8-28`    |
| 1 Corinthians   | `1cor`   | `1cor-13`       | `1cor-13-4`   |
| 2 Corinthians   | `2cor`   | `2cor-5`        | `2cor-5-17`   |
| Galatians       | `gal`    | `gal-5`         | `gal-5-22`    |
| Ephesians       | `eph`    | `eph-2`         | `eph-2-8`     |
| Philippians     | `phil`   | `phil-4`        | `phil-4-13`   |
| Colossians      | `col`    | `col-3`         | `col-3-23`    |
| 1 Thessalonians | `1thess` | `1thess-5`      | `1thess-5-16` |
| 2 Thessalonians | `2thess` | `2thess-3`      | `2thess-3-3`  |
| 1 Timothy       | `1tim`   | `1tim-6`        | `1tim-6-12`   |
| 2 Timothy       | `2tim`   | `2tim-3`        | `2tim-3-16`   |
| Titus           | `titus`  | `titus-3`       | `titus-3-5`   |
| Philemon        | `phlm`   | `phlm-1`        | `phlm-1-6`    |
| Hebrews         | `heb`    | `heb-11`        | `heb-11-1`    |
| James           | `jas`    | `jas-1`         | `jas-1-5`     |
| 1 Peter         | `1pet`   | `1pet-5`        | `1pet-5-7`    |
| 2 Peter         | `2pet`   | `2pet-3`        | `2pet-3-9`    |
| 1 John          | `1john`  | `1john-4`       | `1john-4-8`   |
| 2 John          | `2john`  | `2john-1`       | `2john-1-6`   |
| 3 John          | `3john`  | `3john-1`       | `3john-1-4`   |
| Jude            | `jude`   | `jude-1`        | `jude-1-24`   |
| Revelation      | `rev`    | `rev-21`        | `rev-21-4`    |

## 🔍 Usage Examples

### Database Queries

```sql
-- Get all verses from John chapter 3
SELECT * FROM bible_verses WHERE id LIKE 'john-3-%';

-- Get specific verse
SELECT * FROM bible_verses WHERE id = 'john-3-16';

-- Get all chapters in Genesis
SELECT * FROM bible_chapters WHERE id LIKE 'gen-%';
```

### API Endpoints

```
GET /api/bible/books/john
GET /api/bible/chapters/john-3
GET /api/bible/verses/john-3-16
```

### URL-Friendly

```
/bible/john/3/16          → john-3-16
/bible/ps/23/1            → ps-23-1
/bible/1cor/13/4          → 1cor-13-4
```

## ✅ Benefits

- **Human Readable**: `john-3-16` is immediately recognizable
- **URL Friendly**: Works perfectly in web addresses
- **Easy Joins**: Simple string matching for relationships
- **OSIS Standard**: Based on established biblical text standards
- **Sortable**: Natural alphabetical sorting works correctly
- **API Friendly**: Clean REST endpoint patterns
