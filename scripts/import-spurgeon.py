"""Build a local link index from Spurgeon Gems' public Scripture-index PDFs.

Usage: python scripts/import-spurgeon.py OT.pdf NT.pdf
Requires pdfplumber. Only titles, references, and public links are retained.
"""
import json
from pathlib import Path
import re
import sys
import pdfplumber


def extract(paths):
    records = []
    for path in paths:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                words = page.extract_words()
                if page.page_number == 1:
                    volume_x = next(w['x0'] for w in words if w['text'] == 'Volume')
                    title_x = next(w['x0'] for w in words if w['text'] == 'Link')
                    number_x = next(w['x0'] for w in words if w['text'] == 'Sermon')
                links = sorted((a for a in page.hyperlinks if a.get('uri', '').startswith('https://www.spurgeongems.org/sermon/')), key=lambda a: a['top'])
                for i, link in enumerate(links):
                    # Wrapped references belong to this row until the next linked title.
                    bottom = links[i + 1]['top'] - 2 if i + 1 < len(links) else page.height - 40
                    row = [w for w in words if link['top'] - 2 <= w['top'] < bottom]
                    reference = ' '.join(w['text'] for w in row if w['x0'] < volume_x - 2)
                    title = ' '.join(w['text'] for w in row if title_x - 2 <= w['x0'] < number_x - 2)
                    title = re.sub(r'^\d+\s*-\s*', '', title).replace('\ufffd', "'")
                    if reference and title and reference not in ('Passage', 'Scripture') and not link['uri'].endswith('/chs0.pdf'):
                        records.append({'reference': reference, 'title': title, 'url': link['uri']})
    return records


if __name__ == '__main__':
    records = extract(sys.argv[1:])
    if len(records) < 3000:
        raise RuntimeError('Incomplete indexes; refusing to replace the catalog')
    output = Path('public/data/spurgeon-sermons.json')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'source': 'https://www.spurgeongems.org/spurgeon-sermons/', 'sermons': records}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Indexed {len(records)} Scripture entries in {output}')
