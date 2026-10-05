# Elara Avatar pre-export validator
# Run before each GLB/VRM candidate export.
import bpy
from mathutils import Vector

MAX_DESKTOP_TRIANGLES = 110000
REQUIRED_SHAPE_KEYS = {
    "faceWidth","jawWidth","chinLength","cheekVolume",
    "eyeSize","eyeSpacing","eyeTilt",
    "noseWidth","noseLength","noseBridge","noseTip",
    "mouthWidth","lipFullness","browHeight"
}

def triangles(obj):
    if obj.type != 'MESH':
        return 0
    deps = bpy.context.evaluated_depsgraph_get()
    eval_obj = obj.evaluated_get(deps)
    mesh = eval_obj.to_mesh()
    mesh.calc_loop_triangles()
    count = len(mesh.loop_triangles)
    eval_obj.to_mesh_clear()
    return count

errors=[]
warnings=[]
mesh_objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
armatures=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']

total=sum(triangles(o) for o in mesh_objects)

for obj in mesh_objects + armatures:
    sx,sy,sz=obj.scale
    if max(abs(sx-1),abs(sy-1),abs(sz-1)) > 0.001:
        errors.append(f"Unapplied scale: {obj.name} = {tuple(round(v,4) for v in obj.scale)}")

if not armatures:
    errors.append("No armature found.")
elif len(armatures)>1:
    warnings.append(f"Multiple armatures found: {[a.name for a in armatures]}")

if total > MAX_DESKTOP_TRIANGLES:
    warnings.append(f"Triangle budget high: {total:,} > {MAX_DESKTOP_TRIANGLES:,}")

# Collect shape keys across meshes because face/body may be separate objects.
keys=set()
for obj in mesh_objects:
    if obj.data.shape_keys:
        keys.update(k.name for k in obj.data.shape_keys.key_blocks)

missing=sorted(REQUIRED_SHAPE_KEYS-keys)
if missing:
    warnings.append("Missing planned customization shape keys: " + ", ".join(missing))

# Basic material/UV checks.
for obj in mesh_objects:
    if len(obj.data.uv_layers)==0:
        warnings.append(f"No UV map: {obj.name}")
    if len(obj.material_slots)==0:
        warnings.append(f"No material: {obj.name}")

print("\n=== ELARA AVATAR VALIDATION ===")
print(f"Meshes: {len(mesh_objects)}")
print(f"Armatures: {len(armatures)}")
print(f"Estimated triangles: {total:,}")

if warnings:
    print("\nWARNINGS:")
    for w in warnings:
        print(" -",w)

if errors:
    print("\nERRORS:")
    for e in errors:
        print(" -",e)
    raise RuntimeError(f"Elara validation failed with {len(errors)} error(s).")

print("\nValidation completed. Resolve warnings before Production sign-off.")
