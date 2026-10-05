# Elara approved turnaround reference loader
# Run after elara_avatar_setup.py.
# Put the two approved PNG files in avatar/reference/ using the canonical names.

import bpy
from pathlib import Path

CANONICAL = {
    "FEMALE": "female-turnaround-approved-2026-10-05.png",
    "MALE": "male-turnaround-approved-2026-10-05.png",
}

# Resolve repository root from the current .blend directory.
blend_dir = Path(bpy.path.abspath("//")).resolve()
candidates = [blend_dir, *blend_dir.parents]
repo_root = next((p for p in candidates if (p / "avatar").exists() and (p / "docs").exists()), blend_dir)
ref_dir = repo_root / "avatar" / "reference"

collection = bpy.data.collections.get("ELARA_REFERENCE")
if collection is None:
    collection = bpy.data.collections.new("ELARA_REFERENCE")
    bpy.context.scene.collection.children.link(collection)

def add_reference(label, path, x):
    if not path.exists():
        print(f"[Elara] Missing {label} reference: {path}")
        return
    image = bpy.data.images.load(str(path), check_existing=True)
    obj = bpy.data.objects.new(f"REF_{label}", None)
    obj.empty_display_type = 'IMAGE'
    obj.data = image
    obj.empty_display_size = 3.0
    obj.color[3] = 0.75
    obj.location = (x, 0.8, 3.0)
    obj.rotation_euler = (1.57079632679, 0, 0)
    collection.objects.link(obj)
    print(f"[Elara] Loaded {label}: {path.name}")

add_reference("FEMALE", ref_dir / CANONICAL["FEMALE"], -2.0)
add_reference("MALE", ref_dir / CANONICAL["MALE"], 2.0)

print("[Elara] Reference setup complete. Keep these objects in ELARA_REFERENCE and do not model into the reference collection.")
