#!/usr/bin/env python3
"""Read *only published* public Firestore content and produce a reviewable SEO snapshot.

Calls anonymous Firestore REST query with a public Firebase *web* API key, not an
Admin SDK or service account. Firebase Security Rules must explicitly permit
queries constrained by status == published. No privileged database access.
"""
import argparse
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from build_seo import validated_base

PROJECT_ID = "elara-ab1aa"
LIMIT = 1001
VALID_ID = re.compile(r"^[A-Za-z0-9_-]{1,140}$")
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{1,79}$")
COLLECTIONS = (("blogArticles", "articles", "blog"), ("sitePages", "pages", "page"))


def firestore_value(value):
    if not isinstance(value, dict):
        raise ValueError("Malformed Firestore field")
    if "stringValue" in value:
        return str(value["stringValue"])
    if "booleanValue" in value:
        return value["booleanValue"] is True
    if "integerValue" in value:
        return int(value["integerValue"])
    if "timestampValue" in value:
        return str(value["timestampValue"])
    if "nullValue" in value:
        return None
    return None


def decode_document(record, collection):
    document = record.get("document")
    if not document:
        # Firestore may return an empty readTime-only item for an empty query.
        return None
    name = document.get("name", "")
    prefix = "projects/" + PROJECT_ID + "/databases/(default)/documents/" + collection + "/"
    if not name.startswith(prefix):
        raise ValueError("Unexpected Firestore document path")
    doc_id = name[len(prefix):]
    if not VALID_ID.fullmatch(doc_id):
        raise ValueError("Unexpected document ID")
    fields = document.get("fields", {})
    if not isinstance(fields, dict):
        raise ValueError("Malformed Firestore field map")
    row = {key: firestore_value(value) for key, value in fields.items() if key in {
        "status", "seoNoindex", "seoSlug", "seoTitle", "seoDescription",
        "seoKeyword", "slug", "title", "excerpt", "body", "category",
        "locale", "coverUrl", "createdAt", "updatedAt"
    }}
    row["id"] = doc_id
    return row


def public_entry(row, kind):
    if row.get("status") != "published" or row.get("seoNoindex") is True:
        return None
    lang = row.get("locale")
    if lang not in ("fa", "en"):
        raise ValueError("Published document has invalid locale")
    slug = row.get("seoSlug") or row["id"] if kind == "blog" else row.get("slug") or row["id"]
    if not SLUG.fullmatch(str(slug)):
        raise ValueError("Published document has invalid public slug: " + row["id"])
    def required(key):
        v = row.get(key)
        if not isinstance(v, str) or not v.strip():
            raise ValueError("Published document missing " + key + ": " + row["id"])
        return v.strip()
    result = {
        "status": "published", "seoNoindex": False, "slug": slug, "locale": lang,
        "title": required("title"), "excerpt": required("excerpt"),
        "body": required("body"), "seoTitle": str(row.get("seoTitle") or "").strip(),
        "seoDescription": str(row.get("seoDescription") or "").strip(),
        "seoKeyword": str(row.get("seoKeyword") or "").strip(),
        "createdAt": row.get("createdAt"), "updatedAt": row.get("updatedAt")
    }
    if kind == "blog":
        result["category"] = str(row.get("category") or "productivity")
        cover = str(row.get("coverUrl") or "")
        result["coverUrl"] = cover if cover.startswith("https://") else ""
    return result


def query_public_collection(collection, api_key, transport=None):
    if not VALID_ID.fullmatch(collection):
        raise ValueError("Invalid collection")
    url = ("https://firestore.googleapis.com/v1/projects/" + PROJECT_ID +
           "/databases/(default)/documents:runQuery?key=" + urllib.parse.quote(api_key))
    query = {
        "structuredQuery": {
            "from": [{"collectionId": collection}],
            "where": {"fieldFilter": {
                "field": {"fieldPath": "status"}, "op": "EQUAL",
                "value": {"stringValue": "published"}
            }},
            "limit": LIMIT
        }
    }
    payload = json.dumps(query).encode("utf-8")
    if transport is None:
        def transport(url, payload):
            request = urllib.request.Request(
                url, data=payload, headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(request, timeout=25) as response:
                return response.read(8_000_000)
    try:
        data = json.loads(transport(url, payload))
    except urllib.error.HTTPError as error:
        raise RuntimeError("Firestore public query failed with HTTP " + str(error.code)) from error
    if not isinstance(data, list):
        raise ValueError("Firestore API did not return a list")
    if len(data) >= LIMIT:
        raise ValueError("Collection too large for safe single-batch public export")
    rows = []
    for record in data:
        if not isinstance(record, dict):
            raise ValueError("Malformed Firestore response")
        if "error" in record:
            raise ValueError("Firestore returned an error")
        item = decode_document(record, collection)
        if item is not None:
            rows.append(item)
    return rows


def fetch_snapshot(base, api_key, transport=None, require_content=False):
    if not api_key or len(api_key) < 20:
        raise ValueError("FIREBASE_WEB_API_KEY variable is required")
    base = validated_base(base)
    result = {"schemaVersion": 1, "baseUrl": base, "articles": [], "pages": []}
    used = set()
    for source, output, kind in COLLECTIONS:
        records = query_public_collection(source, api_key, transport)
        for row in records:
            entry = public_entry(row, kind)
            if not entry:
                continue
            key = (kind, entry["locale"], entry["slug"])
            if key in used:
                raise ValueError("Duplicate public URL: " + str(key))
            used.add(key)
            result[output].append(entry)
    if require_content and not (result["articles"] or result["pages"]):
        raise ValueError("Refusing to publish empty public content without manual review")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="seo/public-content.json")
    parser.add_argument("--base-url", default=os.environ.get("ELARA_SEO_BASE_URL", ""))
    parser.add_argument("--require-content", action="store_true")
    args = parser.parse_args()
    snapshot = fetch_snapshot(args.base_url, os.environ.get("FIREBASE_WEB_API_KEY", ""),
                              require_content=args.require_content)
    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"articles": len(snapshot["articles"]), "pages": len(snapshot["pages"]),
                      "baseUrl": snapshot["baseUrl"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
