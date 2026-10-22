#!/usr/bin/env python3
"""Build crawlable public Elara articles/pages without Firebase or hosting credentials.

Input: owner-exported seo/public-content.json (published, indexable content only).
Output: isolated static files suitable for merging into the site's web root.
"""
import argparse
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlsplit

SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{1,79}$")
DATE = re.compile(r"^\d{4}-\d\d-\d\d")
MARKER = ".elara-seo-output"
STYLE = """body{margin:0;background:#081428;color:#e9efff;font:16px/1.9 system-ui,Tahoma,sans-serif}
main{max-width:800px;margin:30px auto;padding:26px 22px}a{color:#b5caff}header{border-bottom:1px solid #375173;margin-bottom:25px}
h1{font-size:clamp(27px,4vw,44px);line-height:1.5}h2{margin-top:35px}p{overflow-wrap:anywhere}
small,.meta{color:#a7bad8}.lead{font-size:18px;color:#ceddf5}figure{margin:24px 0}
img{max-width:100%;height:auto;border-radius:18px}article{max-width:70ch}ul{padding-inline-start:20px}
footer{border-top:1px solid #375173;margin-top:42px;padding-top:20px}
"""

def escape(value):
    return html.escape(str(value or ""), quote=True)

def validated_base(value):
    parts = urlsplit(str(value or "").strip())
    if (parts.scheme != "https" or not parts.hostname or parts.username or
            parts.password or parts.query or parts.fragment or
            parts.path.startswith("//")):
        raise ValueError("baseUrl must be a complete HTTPS site URL without credentials/query/hash")
    return str(value).rstrip("/") + "/"

def page_url(base, kind, row):
    return base + kind + "/" + row["locale"] + "/" + row["slug"] + "/"

def check_row(kind, row):
    if not isinstance(row, dict):
        raise ValueError("public entry must be an object")
    if row.get("status") != "published" or row.get("seoNoindex") is not False:
        raise ValueError("only explicitly published and indexable entries may be exported")
    if row.get("locale") not in ("fa", "en") or not SLUG.fullmatch(str(row.get("slug", ""))):
        raise ValueError("invalid locale or slug in public content")
    for field in ("title", "excerpt", "body"):
        if not isinstance(row.get(field), str) or not row[field].strip():
            raise ValueError("missing article/page field: " + field)
    if kind == "blog" and row.get("coverUrl") and not str(row["coverUrl"]).startswith("https://"):
        raise ValueError("coverUrl must use HTTPS")

def json_script(value):
    # Never allow content to end the JSON-LD script element.
    return json.dumps(value, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")

def paragraphs(body):
    chunks = re.split(r"\n\s*\n", str(body).strip())
    output = []
    for chunk in chunks:
        t = chunk.strip()
        if not t:
            continue
        if t.startswith("## "):
            output.append("<h2>" + escape(t[3:]) + "</h2>")
        else:
            output.append("<p>" + "<br>".join(escape(x) for x in t.splitlines()) + "</p>")
    return "\n".join(output)

def document(base, kind, row):
    canonical = page_url(base, kind, row)
    title = (row.get("seoTitle") or row["title"]).strip()
    description = (row.get("seoDescription") or row["excerpt"]).strip()
    lang = row["locale"]
    direction = "rtl" if lang == "fa" else "ltr"
    home = escape(base)
    cover = row.get("coverUrl") if kind == "blog" else None
    image = '<figure><img src="' + escape(cover) + '" alt="" loading="lazy"></figure>' if cover else ""
    schema = {"@context": "https://schema.org", "@type": "BlogPosting" if kind == "blog" else "WebPage",
              "headline": row["title"], "description": description, "inLanguage": lang,
              "mainEntityOfPage": canonical, "url": canonical}
    if row.get("createdAt"):
        schema["datePublished"] = row["createdAt"]
    if row.get("updatedAt"):
        schema["dateModified"] = row["updatedAt"]
    if cover:
        schema["image"] = cover
    return f"""<!doctype html>
<html lang="{lang}" dir="{direction}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{escape(canonical)}">
<meta property="og:type" content="{'article' if kind == 'blog' else 'website'}">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(description)}">
<meta property="og:url" content="{escape(canonical)}">
{('<meta property="og:image" content="' + escape(cover) + '">') if cover else ''}
<script type="application/ld+json">{json_script(schema)}</script>
<style>{STYLE}</style>
</head>
<body><main><header><p><a href="{home}">Elara Space</a></p></header>
<article><h1>{escape(row['title'])}</h1><p class="lead">{escape(row['excerpt'])}</p>
{image}{paragraphs(row['body'])}</article>
<footer><a href="{home}">{'بازگشت به الارا' if lang == 'fa' else 'Back to Elara'}</a></footer>
</main></body></html>
"""

def list_page(base, kind, items):
    heading = "مقاله‌های الارا" if kind == "blog" else "صفحات الارا"
    entries = "".join('<li><a href="' + escape(page_url(base, kind, x)) + '">' +
                      escape(x["title"]) + "</a></li>" for x in items)
    canonical = base + kind + "/"
    return f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{heading} | Elara Space</title>
<meta name="description" content="{heading}؛ راهنماها و مطالب رسمی Elara Space.">
<link rel="canonical" href="{escape(canonical)}"><style>{STYLE}</style></head>
<body><main><header><a href="{escape(base)}">Elara Space</a></header>
<h1>{heading}</h1><ul>{entries}</ul></main></body></html>"""

def build(input_file, out_dir, override_base=None):
    source = json.loads(Path(input_file).read_text(encoding="utf-8"))
    if source.get("schemaVersion") != 1:
        raise ValueError("unsupported public content schema")
    base = validated_base(override_base or source.get("baseUrl"))
    target = Path(out_dir).resolve()
    cwd = Path.cwd().resolve()
    if target == cwd or target == Path(target.anchor) or target == Path(input_file).resolve().parent:
        raise ValueError("refusing to overwrite the repository root or a source folder")
    if target.exists():
        if not (target / MARKER).is_file():
            raise ValueError("output folder exists without the SEO builder marker; refusing to delete")
    all_entries = []
    used = set()
    for name, kind in (("articles", "blog"), ("pages", "pages")):
        items = source.get(name, [])
        if not isinstance(items, list):
            raise ValueError(name + " must be an array")
        for row in items:
            check_row(kind, row)
            key = (kind, row["locale"], row["slug"])
            if key in used:
                raise ValueError("duplicate public path: " + str(key))
            used.add(key)
            all_entries.append((kind, row))
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)
    (target / MARKER).write_text("Generated by tools/build_seo.py\n", encoding="utf-8")
    urls = [base]
    for kind, row in all_entries:
        folder = target / kind / row["locale"] / row["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(document(base, kind, row), encoding="utf-8")
        urls.append(page_url(base, kind, row))
    for kind in ("blog", "pages"):
        items = [r for k, r in all_entries if k == kind]
        if items:
            folder = target / kind
            (folder / "index.html").write_text(list_page(base, kind, items), encoding="utf-8")
            urls.append(base + kind + "/")
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sitemap += "".join("<url><loc>" + escape(url) + "</loc></url>\n" for url in urls)
    sitemap += "</urlset>\n"
    (target / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    (target / "robots.txt").write_text("User-agent: *\nAllow: /\nSitemap: " + base + "sitemap.xml\n", encoding="utf-8")
    return {"files": len(urls), "baseUrl": base, "entries": len(all_entries)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="seo/public-content.json")
    parser.add_argument("--out", default="seo-dist")
    parser.add_argument("--base-url", default=None)
    args = parser.parse_args()
    print(json.dumps(build(args.input, args.out, args.base_url), ensure_ascii=False))

if __name__ == "__main__":
    main()
