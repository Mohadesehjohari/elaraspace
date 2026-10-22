"""Regression tests for least-privilege Firestore SEO sync and safe Pages bundling."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import sync_public_seo as sync
import assemble_pages_site as pages


def doc(collection, doc_id, fields):
    values = {}
    for key, value in fields.items():
        if isinstance(value, bool):
            values[key] = {"booleanValue": value}
        elif isinstance(value, int):
            values[key] = {"integerValue": str(value)}
        else:
            values[key] = {"stringValue": value}
    return {
        "document": {
            "name": "projects/elara-ab1aa/databases/(default)/documents/" + collection + "/" + doc_id,
            "fields": values
        }
    }


class PublicSeoSyncTests(unittest.TestCase):
    def setUp(self):
        self.read_queries = []

    def transport(self, url, payload):
        body = json.loads(payload)
        query = body["structuredQuery"]
        self.assertEqual(query["where"]["fieldFilter"]["field"]["fieldPath"], "status")
        self.assertEqual(query["where"]["fieldFilter"]["value"]["stringValue"], "published")
        self.assertNotIn("Authorization", url)
        source = query["from"][0]["collectionId"]
        self.read_queries.append(source)
        if source == "blogArticles":
            rows = [
                doc("blogArticles", "my-article", {
                    "title": "A public Elara article", "excerpt": "A useful description",
                    "body": "This is the body", "status": "published", "locale": "en",
                    "seoSlug": "public-guide", "seoNoindex": False, "seoKeyword": "focus",
                    "updatedBy": "private-user-id", "createdBy": "private-user-id"
                }),
                doc("blogArticles", "not-indexed", {
                    "title": "Hidden", "excerpt": "Hidden", "body": "Hidden",
                    "status": "published", "seoNoindex": True, "locale": "fa"
                }),
                doc("blogArticles", "draft-item", {
                    "title": "Danger", "status": "draft", "locale": "fa"
                }),
            ]
        else:
            rows = [doc("sitePages", "about-elara", {
                "title": "About Elara", "excerpt": "Learn about Elara",
                "body": "Elara is a workspace", "status": "published",
                "locale": "en", "slug": "about-elara"
            })]
        return json.dumps(rows).encode("utf-8")

    def test_published_only_fields_and_routing(self):
        result = sync.fetch_snapshot("https://example.org/elara/", "x" * 35, self.transport, True)
        self.assertEqual(self.read_queries, ["blogArticles", "sitePages"])
        self.assertEqual(len(result["articles"]), 1)
        self.assertEqual(len(result["pages"]), 1)
        self.assertEqual(result["articles"][0]["slug"], "public-guide")
        content = json.dumps(result)
        self.assertNotIn("private-user-id", content)
        self.assertNotIn("draft-item", content)
        self.assertNotIn("not-indexed", content)

    def test_query_fails_on_missing_creds_or_invalid_response(self):
        with self.assertRaisesRegex(ValueError, "API_KEY"):
            sync.fetch_snapshot("https://example.org/", "", self.transport)
        with self.assertRaisesRegex(ValueError, "list"):
            sync.query_public_collection("blogArticles", "x" * 35, lambda *_: b'{"error":"denied"}')

    def test_fails_closed_if_no_published_content(self):
        response = lambda *_: b'[{"readTime":"2026-10-22T01:02:00Z"}]'
        with self.assertRaisesRegex(ValueError, "empty"):
            sync.fetch_snapshot("https://example.org/", "x" * 35, response, True)


class AssemblePublicSiteTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "repo"
        self.root.mkdir()
        self.seo = Path(self.tmp.name) / "seo-dist"
        self.seo.mkdir()
        (self.seo / ".elara-seo-output").write_text("Generated")
        (self.seo / "sitemap.xml").write_text("<urlset/>")
        docdir = self.seo / "blog/fa/intro"
        docdir.mkdir(parents=True)
        (docdir / "index.html").write_text("<h1>Hello</h1>")
        self.out = Path(self.tmp.name) / "output"
        paths = ["index.html", "admin/index.html", "admin/admin.js", "styles.css", "app.js", "admin/deploy.php"]
        for path in paths:
            file = self.root / path
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text("published")
        manifest = {"schema": 1, "repo": "elaraspace", "owner": "Mohadesehjohari", "files": paths}
        (self.root / "deploy").mkdir()
        (self.root / "deploy/production-manifest.json").write_text(json.dumps(manifest))

    def test_publishes_app_and_seo_without_backend_php(self):
        result = pages.assemble(self.root, self.seo, self.out)
        self.assertGreater(result["site_files"], 3)
        self.assertTrue((self.out / "blog/fa/intro/index.html").is_file())
        self.assertTrue((self.out / "sitemap.xml").is_file())
        self.assertTrue((self.out / ".nojekyll").is_file())
        self.assertFalse((self.out / "admin/deploy.php").exists())
        self.assertFalse((self.out / "deploy/production-manifest.json").exists())

    def test_cpanel_dotfile_does_not_block_github_pages(self):
        # Real production manifest explicitly includes .htaccess; Pages must skip it.
        manifest_path = self.root / "deploy/production-manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["files"].insert(0, ".htaccess")
        manifest_path.write_text(json.dumps(manifest))
        (self.root / ".htaccess").write_text("RewriteEngine On")
        pages.assemble(self.root, self.seo, self.out)
        self.assertFalse((self.out / ".htaccess").exists())
        self.assertTrue((self.out / "index.html").exists())

    def test_unexpected_dotfile_is_rejected(self):
        manifest_path = self.root / "deploy/production-manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["files"].append(".env")
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, "unsafe"):
            pages.assemble(self.root, self.seo, self.out)

    def test_rejects_symlinks_and_missing_markers(self):
        self.assertRaisesRegex(ValueError, "unsafe", pages.safe_path, "../.env")
        (self.seo / ".elara-seo-output").unlink()
        with self.assertRaisesRegex(ValueError, "marker"):
            pages.assemble(self.root, self.seo, self.out)

    def test_does_not_replace_unrelated_directory(self):
        self.out.mkdir()
        (self.out / "keep.txt").write_text("important")
        with self.assertRaisesRegex(ValueError, "unrelated"):
            pages.assemble(self.root, self.seo, self.out)
        self.assertTrue((self.out / "keep.txt").is_file())


if __name__ == "__main__":
    unittest.main()
