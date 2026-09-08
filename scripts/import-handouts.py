"""Import user-supplied handouts as searchable text; never publish the original PDFs.

Usage: bundled-python scripts/import-handouts.py --source-dir /path/to/pdfs
Exact sample street addresses are redacted before writing public lesson data.
"""
import argparse
import json
import re
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    'en-classmates': '同学之间的自然交流.pdf',
    'en-academic': '学术和专业讨论英语.pdf',
    'en-quant': 'Quant面试英语.pdf',
    'fr-daily': '法国日常生活场景.pdf',
    'fr-help': '法语礼貌与求助表达.pdf',
    'fr-classmates': '和法国同学自然交流.pdf',
}

def sanitize(text):
    text = re.sub(r'(?i)rue de la Marne', '[nom de la rue]', text)
    text = text.replace('马恩街', '［街道名称］')
    text = re.sub(r'(?i)\b(?:18|dix-huit)(?=\s*[,，]?\s*\[nom de la rue\])', '[numéro]', text)
    text = text.replace('［街道名称］18号', '［街道名称］［门牌号］')
    # Remaining number-only delivery answers are redacted on address pages below.
    return text

def main(source_dir):
    books = {}
    for key, name in FILES.items():
        pages = []
        with pdfplumber.open(Path(source_dir) / name) as pdf:
            for index, page in enumerate(pdf.pages):
                raw = page.extract_text(x_tolerance=2) or ''
                lines = raw.splitlines()
                if lines and lines[-1].strip() == str(index + 1):
                    lines.pop()
                text = sanitize('\n'.join(lines))
                # Fractions/subscripts checked against rendered source pages.
                corrections = {
                    ('en-academic', 1): {'Y (Z) + Y (−Z)\n.\n2': '(Y(Z) + Y(−Z)) / 2.'},
                    ('en-academic', 2): {'Y (Z) + Y (−Z) 1 1\nVar = Var(Y (Z)) + Cov(Y (Z),Y (−Z)).\n( 2 ) 2 2': 'Var((Y(Z) + Y(−Z))/2) = ½ Var(Y(Z)) + ½ Cov(Y(Z), Y(−Z)).'},
                    ('en-quant', 5): {
                        'Let E 0': 'Let E₀', 'Let E 1': 'Let E₁',
                        '5 1\nE = 1 + E + E .\n0 0 1\n6 6': 'E₀ = 1 + (5/6)E₀ + (1/6)E₁.',
                        '5\nE = 1 + E .\n1 0\n6': 'E₁ = 1 + (5/6)E₀.',
                        'E = 6 + E .\n0 1': 'E₀ = 6 + E₁.',
                        '5\nE = 6 + 1 + E .\n0 0\n6': 'E₀ = 6 + 1 + (5/6)E₀.',
                        '1\nE = 7,\n0\n6': '(1/6)E₀ = 7,',
                        'E = 42.\n0': 'E₀ = 42.'},
                    ('en-quant', 7): {
                        'would be\n1/p2\n,': 'would be 1/p²,',
                        'E = 1 + (1 − p)E + pE\n0 0 1': 'E₀ = 1 + (1 − p)E₀ + pE₁',
                        'E = 1 + (1 − p)E .\n1 0': 'E₁ = 1 + (1 − p)E₀.',
                        'pE = 1 + pE ,\n0 1': 'pE₀ = 1 + pE₁,',
                        '1\nE = + E .\n0 p 1': 'E₀ = 1/p + E₁.',
                        '1\nE = + 1 + (1 − p)E .\n0 p 0': 'E₀ = 1/p + 1 + (1 − p)E₀.',
                        '1\npE = + 1,\n0 p': 'pE₀ = 1/p + 1,',
                        '1 + p\nE = .\n0 p2': 'E₀ = (1 + p)/p².',
                        '1/p2': '1/p²'},
                }
                for old, new in corrections.get((key, index + 1), {}).items():
                    if old not in text: raise ValueError(f'Missing expected formula on {key} page {index + 1}: {old}')
                    text = text.replace(old, new)
                if key == 'fr-daily' and index + 1 in [13, 14]:
                    text = re.sub(r'(?i)\b18\b|\bdix-huit\b', '[numéro]', text)
                    text = text.replace('18号', '［门牌号］')
                pages.append({'page': index + 1, 'text': text})
        books[key] = {'source': name, 'pages': pages}
    output = ROOT / 'lib/handouts/books.json'
    output.write_text(json.dumps(books, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(books)} courses / {sum(len(b["pages"]) for b in books.values())} pages')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', required=True)
    main(parser.parse_args().source_dir)
