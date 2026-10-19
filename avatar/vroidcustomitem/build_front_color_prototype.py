#!/usr/bin/env python3
"""Experimental VRoid 2.14 Front Hair color patcher.

Uses a user-exported .vroidcustomitem as source; does NOT synthesize hair geometry.
Preserves all existing hair strands, bounce data, and unknown binary fields.
Import has to be validated inside VRoid Studio.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import struct
import sys
import zipfile


def varint(data, offset):
    value = 0
    for step in range(10):
        if offset >= len(data):
            raise ValueError("truncated protobuf varint")
        number = data[offset]
        offset += 1
        value |= (number & 127) << (step * 7)
        if number < 128:
            return value, offset
    raise ValueError("invalid protobuf varint")


def fields(data, start, end):
    i = start
    while i < end:
        tag, i = varint(data, i)
        number, wire = tag >> 3, tag & 7
        if not number or wire not in (0, 1, 2, 5):
            raise ValueError("invalid protobuf field")
        if wire == 2:
            length, i = varint(data, i)
            v0, v1 = i, i + length
            i = v1
        elif wire == 0:
            v0 = i
            _, i = varint(data, i)
            v1 = i
        else:
            v0 = i
            i += 8 if wire == 1 else 4
            v1 = i
        if i > end:
            raise ValueError("truncated protobuf payload")
        yield number, wire, v0, v1
    if i != end:
        raise ValueError("protobuf length mismatch")


def children(data, region, number):
    return [(a, b) for n, w, a, b in fields(data, *region)
            if n == number and w == 2]


def decode(data, region):
    return bytes(data[region[0]:region[1]]).decode("utf-8")


def color_keys(data, material):
    result = {}
    for descriptor in children(data, material, 10):
        names = children(data, descriptor, 1)
        details = children(data, descriptor, 2)
        if len(names) != 1 or len(details) != 1:
            continue
        name = decode(data, names[0])
        if name not in ("Color", "ShadeColor"):
            continue
        keys = children(data, details[0], 4)
        if len(keys) != 1:
            continue
        identifiers = children(data, keys[0], 1)
        if len(identifiers) == 1:
            result[decode(data, identifiers[0])] = name
    return result


def patch_colors(payload, main, shade):
    data = bytearray(payload)
    bodies = children(data, (0, len(data)), 3)
    if len(bodies) != 1:
        raise ValueError("unsupported transferable (body)")
    touched = set()
    for material in children(data, bodies[0], 2):
        descriptors = children(data, material, 1)
        if len(descriptors) != 1:
            continue
        identifiers = color_keys(data, descriptors[0])
        for entry in children(data, material, 2):
            keys = children(data, entry, 1)
            if len(keys) != 1:
                continue
            name = identifiers.get(decode(data, keys[0]))
            if name not in ("Color", "ShadeColor"):
                continue
            colors = children(data, entry, 3)
            if len(colors) != 1:
                continue
            rgb = bytes.fromhex((main if name == "Color" else shade).lstrip("#"))
            modified = set()
            for channel, wire, a, b in fields(data, *colors[0]):
                if channel in (1, 2, 3) and wire == 5 and b - a == 4:
                    data[a:b] = struct.pack("<f", rgb[channel - 1] / 255.0)
                    modified.add(channel)
            if modified == {1, 2, 3}:
                touched.add(name)
    if touched != {"Color", "ShadeColor"}:
        raise ValueError("did not locate main and shade color fields")
    return bytes(data)


def thumbnail_has_hair_preview(raw: bytes) -> bool:
    """Reject a fully flat-color PNG thumbnail (such as an empty Front item).

    Conservative validation: unknown thumbnail formats are allowed and require
    a manual check. PNG RGB/RGBA 8-bit thumbnails are decoded with stdlib only.
    This catches *blank previews*, not every possible empty geometry case.
    """
    import zlib
    if not raw.startswith(b"\\x89PNG\\r\\n\\x1a\\n"):
        return True
    i, compressed, width, height, depth, kind = 8, bytearray(), None, None, None, None
    while i + 12 <= len(raw):
        size = int.from_bytes(raw[i:i+4], "big")
        marker = raw[i+4:i+8]
        value = raw[i+8:i+8+size]
        i += 12 + size
        if marker == b"IHDR":
            width = int.from_bytes(value[:4], "big")
            height = int.from_bytes(value[4:8], "big")
            depth, kind = value[8], value[9]
        elif marker == b"IDAT":
            compressed.extend(value)
        elif marker == b"IEND":
            break
    if not width or not height or depth != 8 or kind not in (2, 6):
        return True
    bpp = 3 if kind == 2 else 4
    try:
        pixels = zlib.decompress(compressed)
    except zlib.error:
        return True
    stride = width * bpp
    if len(pixels) != height * (stride + 1):
        return True
    previous = bytearray(stride)
    uniform = None
    for r in range(height):
        start = r * (stride + 1)
        filter_kind = pixels[start]
        row = bytearray(pixels[start + 1:start + 1 + stride])
        if filter_kind not in (0, 1, 2, 3, 4):
            return True
        for j in range(stride):
            left = row[j - bpp] if j >= bpp else 0
            up = previous[j]
            up_left = previous[j - bpp] if j >= bpp else 0
            if filter_kind == 1:
                prediction = left
            elif filter_kind == 2:
                prediction = up
            elif filter_kind == 3:
                prediction = (left + up) // 2
            elif filter_kind == 4:
                p = left + up - up_left
                a, b, c = abs(p-left), abs(p-up), abs(p-up_left)
                prediction = left if a <= b and a <= c else (up if b <= c else up_left)
            else:
                prediction = 0
            row[j] = (row[j] + prediction) & 255
        if uniform is None:
            uniform = bytes(row[:bpp])
        if row != uniform * width:
            return True
        previous = row
    return False


def create(source, dest, name, main, shade):
    if source.resolve() == dest.resolve():
        raise ValueError("source and destination cannot be the same")
    for color in (main, shade):
        if not re.fullmatch(r"#?[0-9a-fA-F]{6}", color):
            raise ValueError("colors must be #RRGGBB")
    with zipfile.ZipFile(source) as z:
        if "thumbnails/thumbnail.png" in z.namelist() and not thumbnail_has_hair_preview(z.read("thumbnails/thumbnail.png")):
            raise ValueError("Source custom item thumbnail is completely blank. Export a Front Hair item containing visible hair strands; recoloring cannot add new strands.")
        if z.testzip() is not None:
            raise ValueError("source archive failed CRC check")
        metadata = json.loads(z.read("v1customitem/meta.json"))
        if metadata.get("rootTransferableGroupTypeId") != "TransferableGroupType.N00.Level1.HairFront":
            raise ValueError("only HairFront is supported; input must be an exported Front custom item")
        transferable = [n for n in z.namelist()
                        if n.endswith(".transferable") and "/transferables/" in n]
        if len(transferable) != 1:
            raise ValueError("expected exactly one user transferable")
        edited = patch_colors(z.read(transferable[0]), main, shade)
        metadata["displayName"] = name
        replacements = {
            transferable[0]: edited,
            "v1customitem/meta.json": json.dumps(metadata, ensure_ascii=False,
                                                   separators=(",", ":")).encode("utf-8"),
        }
        dest.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(dest, "w") as out:
            for info in z.infolist():
                out.writestr(info, replacements.get(info.filename, z.read(info.filename)))
    with zipfile.ZipFile(dest) as z:
        assert z.testzip() is None
        assert json.loads(z.read("v1customitem/meta.json"))["displayName"] == name
        assert patch_colors(z.read(transferable[0]), main, shade) == z.read(transferable[0])
    return dest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--name", default="Elara Rose - Front Color Prototype")
    parser.add_argument("--main", default="#B97880")
    parser.add_argument("--shade", default="#8D5564")
    args = parser.parse_args()
    try:
        output = create(args.source, args.destination, args.name, args.main, args.shade)
        print(f"Generated {output} ({output.stat().st_size} bytes).")
        print("NOTE: Shape unchanged; color prototype only. Test import in VRoid Studio.")
    except (ValueError, OSError, zipfile.BadZipFile) as error:
        sys.exit(f"Error: {error}")
