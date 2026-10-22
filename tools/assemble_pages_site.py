#!/usr/bin/env python3
"""Assemble an entire static Elara GitHub Pages bundle with crawlable SEO pages.

Only copies known public files from production-manifest.json. Never publishes
Firebase rules, backend PHP, secrets, private data, docs, or CI artifacts.
"""
import argparse
import json
import shutil
from pathlib import Path

SAFE_EXTENSIONS = {
    ".html", ".js", ".css", ".svg", ".png", ".webp", ".jpg", ".jpeg",
    ".gif", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".mp3", ".wav",
    ".ogg", ".mp4", ".webm", ".glb", ".gltf", ".vrm", ".bin", ".fbx",
    ".avif", ".json", ".wasm", ".vtt", ".txt", ".xml"
}
MARKER = ".elara-pages-bundle"


def safe_path(path):
    if not isinstance(path, str) or not path or path.startswith(".") or "\\" in path:
        raise ValueError("unsafe public file path")
    parts = Path(path).parts
    if Path(path).is_absolute() or any(part in ("..", ".", "") or part.startswith(".") for part in parts):
        raise ValueError("unsafe public file path")
    if any(part in {"deploy", "tests", "docs", "seo", ".github", "backups"} for part in parts):
        raise ValueError("server-only path in manifest")
    if Path(path).suffix.lower() not in SAFE_EXTENSIONS:
        return False
    return True


def copy_safe_file(source, destination):
    if not source.is_file() or source.is_symlink():
        raise ValueError("missing or symlinked public asset: " + str(source))
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)


def assemble(root, generated, out):
    root, generated, out = [Path(x).resolve() for x in (root, generated, out)]
    if not (root / "index.html").is_file():
        raise ValueError("site root missing index.html")
    if not (generated / ".elara-seo-output").is_file():
        raise ValueError("expected validated SEO build output marker")
    manifest = json.loads((root / "deploy/production-manifest.json").read_text(encoding="utf-8"))
    if manifest.get("schema") != 1 or manifest.get("repo") != "elaraspace" or manifest.get("owner") != "Mohadesehjohari":
        raise ValueError("unexpected deployment manifest")
    paths = manifest.get("files")
    if not isinstance(paths, list) or len(paths) < 5:
        raise ValueError("manifest missing public file list")
    if out in (root, generated) or out == Path(out.anchor):
        raise ValueError("unsafe bundle destination")
    if out.exists():
        if not (out / MARKER).is_file():
            raise ValueError("refusing to replace an unrelated directory")
        shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / MARKER).write_text("Generated Elara Pages bundle\n", encoding="utf-8")
    copied = 0
    seen = set()
    for rel in paths:
        # Apache control file is needed only on cPanel. Never ship it to Pages.
        if rel == ".htaccess":
            continue
        if not safe_path(rel):
            continue
        if rel in seen:
            raise ValueError("duplicate manifest file: " + rel)
        seen.add(rel)
        copy_safe_file(root / rel, out / rel)
        copied += 1
    if not (out / "index.html").is_file() or not (out / "admin/index.html").is_file():
        raise ValueError("manifest does not include site and admin entrypoints")
    generated_files = 0
    for source in generated.rglob("*"):
        if not source.is_file() or source.name.startswith("."):
            continue
        if source.is_symlink():
            raise ValueError("SEO output contains symlink")
        rel = source.relative_to(generated)
        if not safe_path(str(rel)):
            raise ValueError("unsafe generated SEO path: " + str(rel))
        target = out / rel
        if target.exists():
            raise ValueError("SEO generated route collides with an existing site asset: " + str(rel))
        copy_safe_file(source, target)
        generated_files += 1
    (out / ".nojekyll").touch()
    (out / MARKER).unlink()
    return {"site_files": copied, "seo_files": generated_files}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("--seo", default="seo-dist")
    parser.add_argument("--out", default="pages-dist")
    args = parser.parse_args()
    print(json.dumps(assemble(args.root, args.seo, args.out)))


if __name__ == "__main__":
    main()
