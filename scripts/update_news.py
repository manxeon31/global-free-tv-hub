"""Fetch fixed publisher RSS/Atom feeds. No article pages, tokens, or public proxies.

Only short feed-supplied excerpts are retained. Failed sources keep last-good data.
Run from the repository root with Python 3.11+.
"""
import concurrent.futures
import datetime as dt
import email.utils
import html
from html.parser import HTMLParser
import ipaddress
import json
from pathlib import Path
import socket
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

UTC = dt.timezone.utc
MAX_BYTES = 2_000_000

class TextOnly(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.blocked = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.blocked += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.blocked:
            self.blocked -= 1
    def handle_data(self, data):
        if not self.blocked:
            self.parts.append(data)

def plain(value, limit):
    parser = TextOnly()
    parser.feed(html.unescape(value or ''))
    text = ' '.join(' '.join(parser.parts).split())
    return text if len(text) <= limit else text[:limit-1].rsplit(' ', 1)[0] + '…'

def safe_url(value, domains):
    try:
        u = urllib.parse.urlsplit(value)
        return u.scheme == 'https' and not u.username and not u.password and u.port in (None, 443) and any(u.hostname == d or u.hostname.endswith('.' + d) for d in domains)
    except (ValueError, AttributeError):
        return False

def iso_date(value):
    if not value:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(value)
    except (ValueError, TypeError):
        try:
            parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None
    if not parsed.tzinfo:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC).isoformat()

def parse_feed(data, source):
    # ElementTree does not fetch external entities; also reject declarations outright.
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('XML declarations not allowed')
    root = ET.fromstring(data)
    entries = [n for n in root.iter() if n.tag.rsplit('}', 1)[-1] in ('item', 'entry')]
    out, seen = [], set()
    def content(node, names):
        return next((''.join(c.itertext()) for c in node if c.tag.rsplit('}', 1)[-1] in names), '')
    for node in entries:
        title = plain(content(node, ('title',)), 160)
        link = next((c.get('href') or c.text or '' for c in node if c.tag.rsplit('}', 1)[-1] == 'link' and c.get('rel', 'alternate') == 'alternate'), '').strip()
        if not title or link in seen or not safe_url(link, source['articleDomains']):
            continue
        seen.add(link)
        out.append({'title': title, 'summary': plain(content(node, ('description', 'summary')), 160), 'url': link, 'publishedAt': iso_date(content(node, ('pubDate', 'published', 'updated', 'date')))})
    out.sort(key=lambda item: item['publishedAt'] or '', reverse=True)
    return out[:3]

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, domains):
        self.domains = domains
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_network(newurl, self.domains)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def validate_network(url, domains):
    if not safe_url(url, domains):
        raise ValueError('Feed redirect is outside approved origins')
    hostname = urllib.parse.urlsplit(url).hostname
    addresses = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError('Feed origin is not a public address')

def fetch_source(source):
    domains = [urllib.parse.urlsplit(source['url']).hostname] + source['articleDomains']
    validate_network(source['url'], domains)
    opener = urllib.request.build_opener(SafeRedirect(domains))
    request = urllib.request.Request(source['url'], headers={'User-Agent': 'Atlas-Free-TV-Hub/0.2 (+https://github.com/manxeon31/global-free-tv-hub)', 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml', 'Accept-Encoding': 'identity'})
    with opener.open(request, timeout=15) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError('Feed exceeds size limit')
    items = parse_feed(data, source)
    if not items:
        raise ValueError('No valid feed entries')
    return items

def main():
    sources = json.loads(Path('scripts/news-sources.json').read_text(encoding='utf-8'))
    cache = Path('work/headlines-cache.json')
    try:
        previous = json.loads(cache.read_text(encoding='utf-8')).get('sources', {})
    except (FileNotFoundError, ValueError):
        previous = {}
    now = dt.datetime.now(UTC).isoformat()
    results = {}
    def collect(source):
        try:
            return source['id'], {'name': source['name'], 'feedUrl': source['url'], 'channels': source['channels'], 'fetchedAt': now, 'status': 'ok', 'items': fetch_source(source)}
        except Exception as exc:
            old = previous.get(source['id'], {})
            print(f"Feed {source['id']}: {type(exc).__name__}; last-good items: {len(old.get('items', []))}")
            return source['id'], {'name': source['name'], 'feedUrl': source['url'], 'channels': source['channels'], 'fetchedAt': old.get('fetchedAt'), 'status': 'unavailable', 'items': old.get('items', [])}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results.update(pool.map(collect, sources))
    payload = {'version': 1, 'generatedAt': now, 'refreshMinutes': 15, 'kind': 'publisher-headlines', 'sources': results}
    serialized = json.dumps(payload, ensure_ascii=False, indent=2)
    Path('public/headlines.json').write_text(serialized, encoding='utf-8')
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(serialized, encoding='utf-8')
    good = sum(r['status'] == 'ok' for r in results.values())
    print(f'Headline refresh: {good}/{len(sources)} sources fetched; {sum(len(r["items"]) for r in results.values())} retained items')
    if good == 0 and not any(r['items'] for r in results.values()):
        raise SystemExit('No usable feeds; preserve the current deployed site')

if __name__ == '__main__':
    main()
