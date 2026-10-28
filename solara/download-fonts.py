"""Install the project's Manrope fallback from the official Google Fonts files.

Run once from the solara project directory: python download-fonts.py
No third-party Python packages are required. The resulting font is self-hosted.
Soledago is NOT in Google Fonts and must be provided separately by its owner.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import sys

ROOT = Path(__file__).resolve().parent
FONTS = ROOT / 'assets' / 'fonts'
BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/'
FILES = {
    'Manrope.ttf': 'Manrope%5Bwght%5D.ttf',
    'OFL-Manrope.txt': 'OFL.txt',
}


def fetch(remote, target):
    req = Request(BASE + remote, headers={
        'User-Agent': 'SOLARA-Beach-Club-font-installer',
        'Accept': 'application/octet-stream, text/plain, */*',
    })
    with urlopen(req, timeout=30) as response:
        data = response.read()
    if target.name.endswith('.ttf') and not (
            len(data) > 50000 and data[:4] in (b'\x00\x01\x00\x00', b'OTTO', b'ttcf')):
        raise ValueError('Downloaded file is not a valid OpenType/TrueType font.')
    if target.name.endswith('.txt') and b'OPEN FONT LICENSE' not in data:
        raise ValueError('Unexpected font license content.')
    target.write_bytes(data)
    print(f'  {target.relative_to(ROOT)} ({len(data):,} bytes)')


def main():
    FONTS.mkdir(parents=True, exist_ok=True)
    print('Downloading Manrope from the official Google Fonts repository...')
    try:
        for filename, remote in FILES.items():
            fetch(remote, FONTS / filename)
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as error:
        print(f'Could not download fonts: {error}', file=sys.stderr)
        return 1
    # Once the font is installed, switch off the old external Google Fonts links.
    # This makes the site self-hosted, including when published on GitHub Pages.
    page = ROOT / 'index.html'
    html = page.read_text(encoding='utf-8')
    external_tags = [
        '  <link rel="preconnect" href="https://fonts.googleapis.com">\n',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n',
        '  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n',
    ]
    modified = html
    for tag in external_tags:
        modified = modified.replace(tag, '')
    if modified != html:
        page.write_text(modified, encoding='utf-8')
    print('Done. The website now uses local Manrope without external Google Fonts requests.')
    print('Exact Soledago fonts are separate and cannot be downloaded from Google Fonts.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
