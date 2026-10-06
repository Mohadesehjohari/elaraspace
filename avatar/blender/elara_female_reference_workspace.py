# Elara Female Reference Workspace v1.0
# Blender 5.2+ / 4.x compatible
# This script intentionally DOES NOT generate a fake final character.
# It clears the rejected procedural blockout and creates a clean reference-driven
# modeling workspace using the approved female front / side / face sheets.

import bpy
import math
from pathlib import Path

WORKSPACE_COLLECTION = "ELARA_REFERENCE_WORKSPACE"
REJECTED_COLLECTION = "ELARA_GENERATED_BLOCKOUT"
CHARACTER_HEIGHT_M = 1.76

def delete_collection_objects(name):
    col = bpy.data.collections.get(name)
    if not col:
        return
    for obj in list(col.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

def ensure_collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col

def link_only(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)

def find_asset(filename):
    candidates = []
    try:
        candidates.append(Path(__file__).resolve().parent / filename)
    except Exception:
        pass
    if bpy.data.filepath:
        candidates.append(Path(bpy.data.filepath).resolve().parent / filename)
    candidates.append(Path.home() / "Downloads" / filename)
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError(
        f"Missing {filename}. Keep the .py file and PNG files in the same folder."
    )

def add_image_empty(name, image_path, location, rotation, size, alpha=0.5):
    image = bpy.data.images.load(str(image_path), check_existing=True)
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = 'IMAGE'
    obj.data = image
    obj.empty_display_size = size
    obj.color[3] = alpha
    obj.empty_image_depth = 'BACK'
    obj.show_in_front = False
    obj.location = location
    obj.rotation_euler = rotation
    refs.objects.link(obj)
    return obj

def add_measure_line(name, x, z0, z1):
    curve = bpy.data.curves.new(name + "_Curve", 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = 0.002
    curve.bevel_resolution = 2
    spl = curve.splines.new('POLY')
    spl.points.add(1)
    spl.points[0].co = (x, 0, z0, 1)
    spl.points[1].co = (x, 0, z1, 1)
    obj = bpy.data.objects.new(name, curve)
    refs.objects.link(obj)
    return obj

delete_collection_objects(REJECTED_COLLECTION)
delete_collection_objects(WORKSPACE_COLLECTION)
refs = ensure_collection(WORKSPACE_COLLECTION)

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.render.engine = 'BLENDER_EEVEE'
scene["elara_art_direction"] = "2026-10-05-approved-female-turnaround"
scene["elara_workspace"] = "reference-driven-v1"
scene["elara_procedural_blockout"] = "rejected"

front_path = find_asset("female_front.png")
side_path = find_asset("female_side.png")
face_path = find_asset("female_face.png")

front = add_image_empty(
    "REF_Female_Front", front_path,
    (0.0, 0.36, CHARACTER_HEIGHT_M * 0.50),
    (math.radians(90), 0.0, 0.0),
    CHARACTER_HEIGHT_M, 0.56
)
front["reference_role"] = "front"

side = add_image_empty(
    "REF_Female_Side", side_path,
    (0.38, 0.0, CHARACTER_HEIGHT_M * 0.50),
    (math.radians(90), 0.0, math.radians(90)),
    CHARACTER_HEIGHT_M, 0.50
)
side["reference_role"] = "side"

face = add_image_empty(
    "REF_Female_Face_Closeup", face_path,
    (-1.10, 0.38, 1.48),
    (math.radians(90), 0.0, 0.0),
    0.75, 0.62
)
face["reference_role"] = "face-closeup"

add_measure_line("GUIDE_Height_Left", -0.42, 0.0, CHARACTER_HEIGHT_M)
add_measure_line("GUIDE_Height_Right", 0.42, 0.0, CHARACTER_HEIGHT_M)

bpy.ops.mesh.primitive_plane_add(size=2.2, location=(0, 0, 0))
ground = bpy.context.object
ground.name = "ELARA_Ground_Guide"
link_only(ground, refs)
ground.display_type = 'WIRE'
ground.hide_render = True

production = bpy.data.collections.get("ELARA_PRODUCTION_MODEL")
if production is None:
    production = bpy.data.collections.new("ELARA_PRODUCTION_MODEL")
    bpy.context.scene.collection.children.link(production)

for obj in refs.objects:
    if obj.name.startswith("REF_") or obj.name.startswith("GUIDE_"):
        obj.hide_select = True
        obj.hide_render = True

bpy.ops.object.select_all(action='DESELECT')
ground.select_set(True)
bpy.context.view_layer.objects.active = ground

print("ELARA REFERENCE WORKSPACE READY")
print("Rejected procedural blockout removed.")
print("Approved female front / side / face references loaded.")
print("Model production geometry only inside ELARA_PRODUCTION_MODEL.")
