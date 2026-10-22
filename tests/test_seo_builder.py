"""Tests for crawlable SEO generation and public-only export constraints."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("elara_seo_builder", ROOT / "tools" / "build_seo.py")
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class SeoBuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        self.source = self.home / "snapshot.json"
        self.output = self.home / "dist"

    def snapshot(self, **updates):
        row = {
            "status": "published", "seoNoindex": False, "slug": "pomodoro-guide",
            "locale": "fa", "title": "تکنیک پومودورو و تمرکز",
            "excerpt": "آشنایی با روش مدیریت زمان و جلسات تمرکز",
            "body": "توضیح کامل و قابل مطالعه. <script>alert(1)</script>",
            "seoTitle": "راهنمای تکنیک پومودورو | Elara Space",
            "seoDescription": "راهنمای مدیریت زمان و افزایش تمرکز با روش پومودورو",
            "createdAt": "2026-10-22T08:00:00Z", "updatedAt": "2026-10-22T09:00:00Z",
        }
        doc = {"schemaVersion": 1, "baseUrl": "https://example.org/elara/",
               "articles": [row], "pages": []}
        doc.update(updates)
        self.source.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        return doc

    def test_generates_real_html_links_and_sitemap(self):
        self.snapshot()
        result = builder.build(self.source, self.output)
        page = (self.output / "blog/fa/pomodoro-guide/index.html").read_text(encoding="utf-8")
        sitemap = (self.output / "sitemap.xml").read_text(encoding="utf-8")
        self.assertEqual(result["entries"], 1)
        self.assertIn('rel="canonical" href="https://example.org/elara/blog/fa/pomodoro-guide/"', page)
        self.assertIn('application/ld+json', page)
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", page)
        self.assertNotIn("<script>alert(1)</script>", page)
        self.assertIn("https://example.org/elara/blog/fa/pomodoro-guide/", sitemap)
        self.assertIn("https://example.org/elara/sitemap.xml",
                      (self.output / "robots.txt").read_text(encoding="utf-8"))
        self.assertTrue((self.output / "blog/index.html").is_file())

    def test_rejects_nonpublic_and_invalid_slug(self):
        doc = self.snapshot()
        doc["articles"][0]["status"] = "draft"
        self.source.write_text(json.dumps(doc), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "published"):
            builder.build(self.source, self.output)
        doc["articles"][0]["status"] = "published"
        doc["articles"][0]["slug"] = "../secret"
        self.source.write_text(json.dumps(doc), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "slug"):
            builder.build(self.source, self.output)

    def test_duplicate_public_path_fails_before_writing(self):
        doc = self.snapshot()
        doc["articles"].append(dict(doc["articles"][0]))
        self.source.write_text(json.dumps(doc), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "duplicate"):
            builder.build(self.source, self.output)
        self.assertFalse(self.output.exists())

    def test_does_not_delete_unknown_output_folder(self):
        self.snapshot()
        self.output.mkdir()
        (self.output / "keep.txt").write_text("do not remove")
        with self.assertRaisesRegex(ValueError, "marker"):
            builder.build(self.source, self.output)
        self.assertTrue((self.output / "keep.txt").exists())

    def test_requires_https_base(self):
        self.snapshot()
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            builder.build(self.source, self.output, "http://example.org/")


if __name__ == "__main__":
    unittest.main()
