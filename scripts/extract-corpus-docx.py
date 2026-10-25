"""Extract the supplied three-column corpus; reject unsupported Word structures.
Usage: python scripts/extract-corpus-docx.py INPUT.docx OUTPUT.json
Only the corpus table is exported; author metadata and personal filenames are omitted.
"""
import hashlib
import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

source, output = map(Path, sys.argv[1:])
with zipfile.ZipFile(source) as z:
    root = ET.fromstring(z.read('word/document.xml'))
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
tables = root.findall('.//w:body/w:tbl', ns)
if len(tables) != 1:
    raise ValueError('Expected exactly one three-column corpus table')
rows = []
for row in tables[0].findall('w:tr', ns):
    cells = ['\n'.join(''.join(t.text or '' for t in p.findall('.//w:t', ns)) for p in c.findall('w:p', ns)).strip() for c in row.findall('w:tc', ns)]
    if len(cells) != 3:
        raise ValueError('Expected three cells per row')
    rows.append(cells)
if rows.pop(0) != ['序号', '中文', '阿拉伯语']:
    raise ValueError('Unsupported table headings')
records = []
for number, chinese, arabic in rows:
    if not number.isdigit() or not chinese or not arabic:
        raise ValueError('Missing row ID or bilingual content')
    records.append({'number': int(number), 'chinese': chinese, 'arabic': arabic})
if len({r['number'] for r in records}) != len(records):
    raise ValueError('Duplicate row number')
output.write_text(json.dumps({'format': 'hikma-bilingual-corpus-v1', 'title': '时政阿拉伯语 · 人类命运共同体', 'date': '2026-10-25', 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'records': records}, ensure_ascii=False, indent=2) + '\n')
print(f'Extracted {len(records)} bilingual records')
