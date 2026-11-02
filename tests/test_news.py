import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('news',Path(__file__).resolve().parents[1]/'scripts/update_news.py')
news=importlib.util.module_from_spec(spec)
spec.loader.exec_module(news)

class NewsParsingTests(unittest.TestCase):
    source={'articleDomains':['example.com']}
    def test_rss_sanitizes_sorts_and_deduplicates(self):
        xml=b'''<rss><channel><item><title>Older</title><link>https://example.com/a</link><pubDate>Sun, 01 Nov 2026 10:00:00 GMT</pubDate><description>&lt;b&gt;Clean&lt;/b&gt;&lt;script&gt;bad()&lt;/script&gt;</description></item><item><title>Newer</title><link>https://example.com/b</link><pubDate>Sun, 01 Nov 2026 11:00:00 GMT</pubDate></item><item><title>Duplicate</title><link>https://example.com/a</link></item><item><title>Wrong host</title><link>https://evil.test/a</link></item></channel></rss>'''
        items=news.parse_feed(xml,self.source)
        self.assertEqual([i['title'] for i in items],['Newer','Older'])
        self.assertEqual(items[1]['summary'],'Clean')
    def test_atom_and_unknown_time(self):
        xml=b'''<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom</title><link href="https://example.com/a"/><summary>Summary</summary><updated>2026-11-01T10:00:00Z</updated></entry></feed>'''
        self.assertEqual(news.parse_feed(xml,self.source)[0]['publishedAt'],'2026-11-01T10:00:00+00:00')
        self.assertIsNone(news.iso_date('invalid'))
    def test_reject_entities(self):
        with self.assertRaises(ValueError):news.parse_feed(b'<!DOCTYPE rss [<!ENTITY bad "boom">]><rss/>',self.source)
    def test_url_boundary(self):
        self.assertFalse(news.safe_url('https://example.com.evil.test/a',['example.com']))
        self.assertFalse(news.safe_url('https://u:p@example.com/a',['example.com']))
        self.assertFalse(news.safe_url('http://example.com/a',['example.com']))

if __name__=='__main__':unittest.main()
