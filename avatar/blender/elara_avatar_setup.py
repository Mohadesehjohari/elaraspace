# Elara Avatar Blender setup
# Run from Blender's Scripting workspace.
import bpy

COLLECTIONS = [
    "ELARA_REFERENCE",
    "ELARA_BODY",
    "ELARA_FACE",
    "ELARA_EYES",
    "ELARA_HAIR",
    "ELARA_RIG",
    "ELARA_EXPORT",
]

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.unit_settings.length_unit = 'METERS'

for name in COLLECTIONS:
    if name not in bpy.data.collections:
        col = bpy.data.collections.new(name)
        scene.collection.children.link(col)

scene["elara_avatar_pipeline"] = "production-v1"
scene["elara_skeleton_version"] = "unfrozen"
scene["elara_art_direction"] = "2026-10-05-approved-turnaround"
scene["elara_export_target"] = "VRM1/GLB"

# Helpful neutral viewport defaults.
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1200
scene.render.resolution_y = 1600
scene.render.resolution_percentage = 100

print("Elara Avatar scene initialized.")
print("Next: import approved reference sheets into ELARA_REFERENCE and start the high-quality blockout.")
