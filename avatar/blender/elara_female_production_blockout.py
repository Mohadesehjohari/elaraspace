# Elara Female Production Blockout v1
# Blender 4.x
#
# Purpose:
#   Generate a structured, smooth anime/semi-real FEMALE production blockout
#   from the approved Elara proportions. This is NOT the final sculpt.
#   It gives us a much better starting point than the old website procedural mesh:
#   integrated torso/pelvis silhouette, long fashion-model limbs, refined head,
#   eyes, collar/neck, hair guide curves, rig scaffold, materials and shape-key scaffold.
#
# Run:
#   Blender -> Scripting -> Open -> Run Script
#
# Safe behavior:
#   Only deletes/rebuilds objects inside ELARA_GENERATED_BLOCKOUT.
#
# Next manual/art steps after running:
#   sculpt face/body to exact turnaround, retopology cleanup, final hair clumps,
#   weight paint, corrective shapes, VRM export.

import bpy
import bmesh
import math
from mathutils import Vector

# ------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------
COLLECTION = "ELARA_GENERATED_BLOCKOUT"
BODY_SEGMENTS = 40
LIMB_SEGMENTS = 28
SUBDIV_VIEW = 2
SUBDIV_RENDER = 2

SKIN = (0.78, 0.56, 0.48, 1.0)
SUIT = (0.67, 0.56, 0.51, 1.0)
HAIR = (0.52, 0.20, 0.22, 1.0)
HAIR_HI = (0.68, 0.30, 0.33, 1.0)
EYE_WHITE = (0.96, 0.96, 0.95, 1.0)
IRIS = (0.23, 0.17, 0.16, 1.0)
LASH = (0.08, 0.05, 0.05, 1.0)
LIP = (0.58, 0.26, 0.28, 1.0)

# Character height is ~1.76m, long-legged adult anime-fashion proportions.
GROUND_Z = 0.0
ANKLE_Z = 0.12
KNEE_Z = 0.52
CROTCH_Z = 0.91
WAIST_Z = 1.11
CHEST_Z = 1.36
SHOULDER_Z = 1.52
NECK_BASE_Z = 1.59
HEAD_CENTER_Z = 1.78

# ------------------------------------------------------------
# UTILS
# ------------------------------------------------------------
def ensure_collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col

def clear_collection(col):
    for obj in list(col.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

def link_only(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)

def make_mat(name, rgba, roughness=0.72, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = 0.28
    return mat

def smooth(obj):
    if obj.type == "MESH":
        for p in obj.data.polygons:
            p.use_smooth = True

def add_subsurf(obj, levels=SUBDIV_VIEW):
    mod = obj.modifiers.new("Elara_Subdivision", "SUBSURF")
    mod.subdivision_type = "CATMULL_CLARK"
    mod.levels = levels
    mod.render_levels = SUBDIV_RENDER
    return mod

def make_loft(name, rings, segments, mat, col):
    """
    rings: [(z, rx, ry, cy), ...]
      z = vertical world coordinate
      rx = half width X
      ry = front/back depth Y radius
      cy = Y center offset (positive = forward)
    """
    verts=[]
    faces=[]
    for ri,(z,rx,ry,cy) in enumerate(rings):
        for s in range(segments):
            a=2*math.pi*s/segments
            # slight anime shaping: flatter lateral sides, softer front/back.
            ca=math.cos(a)
            sa=math.sin(a)
            x=rx*ca
            y=cy+ry*sa
            verts.append((x,y,z))
    nr=len(rings)
    for r in range(nr-1):
        for s in range(segments):
            a=r*segments+s
            b=r*segments+(s+1)%segments
            c=(r+1)*segments+(s+1)%segments
            d=(r+1)*segments+s
            faces.append((a,b,c,d))
    # cap bottom/top
    bottom_center=len(verts); verts.append((0,rings[0][3],rings[0][0]))
    top_center=len(verts); verts.append((0,rings[-1][3],rings[-1][0]))
    for s in range(segments):
        ns=(s+1)%segments
        faces.append((bottom_center,ns,s))
        a=(nr-1)*segments+s
        b=(nr-1)*segments+ns
        faces.append((top_center,a,b))

    mesh=bpy.data.meshes.new(name+"_Mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    col.objects.link(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    add_subsurf(obj)
    return obj

def add_uv_sphere(name, location, scale, mat, col, seg=48, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=location)
    obj=bpy.context.object
    obj.name=name
    obj.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    link_only(obj,col)
    obj.data.materials.append(mat)
    smooth(obj)
    add_subsurf(obj,1)
    return obj

def add_capsule_between(name, p1, p2, r1, r2, mat, col, segments=LIMB_SEGMENTS):
    """Tapered organic limb as loft along a straight axis."""
    p1=Vector(p1); p2=Vector(p2)
    axis=p2-p1
    length=axis.length
    if length < 1e-5:
        raise ValueError(name+" has zero length")
    mid=(p1+p2)*0.5

    # build along local Z then orient.
    rings=[]
    samples=8
    for i in range(samples):
        t=i/(samples-1)
        z=-length*0.5 + t*length
        # smooth radius transition
        st=t*t*(3-2*t)
        r=(1-st)*r1+st*r2
        # tiny joint support at ends
        if i in (0,samples-1):
            r*=0.94
        rings.append((z,r,r*0.92,0.0))
    obj=make_loft(name,rings,segments,mat,col)
    obj.location=mid
    q=Vector((0,0,1)).rotation_difference(axis.normalized())
    obj.rotation_mode='QUATERNION'
    obj.rotation_quaternion=q
    return obj

def add_curve_hair(name, points, bevel, mat, col):
    curve=bpy.data.curves.new(name+"_Curve","CURVE")
    curve.dimensions='3D'
    curve.resolution_u=4
    curve.bevel_depth=bevel
    curve.bevel_resolution=4
    spl=curve.splines.new('BEZIER')
    spl.bezier_points.add(len(points)-1)
    for bp,co in zip(spl.bezier_points,points):
        bp.co=co
        bp.handle_left_type='AUTO'
        bp.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve)
    col.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def add_shape_key_scaffold(obj):
    if obj.type!='MESH':
        return
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis")
    wanted=[
        "faceWidth","jawWidth","jawAngle","chinLength","chinWidth","cheekVolume",
        "eyeSize","eyeSpacing","eyeTilt","eyeHeight",
        "noseWidth","noseLength","noseBridge","noseTip",
        "mouthWidth","lipFullness","browHeight",
        "blinkLeft","blinkRight","smile","softSmile","angry","sad","surprised","relaxed"
    ]
    existing={k.name for k in obj.data.shape_keys.key_blocks}
    for key in wanted:
        if key not in existing:
            obj.shape_key_add(name=key)

def add_bone(arm, name, head, tail, parent=None, connect=False):
    b=arm.data.edit_bones.new(name)
    b.head=head
    b.tail=tail
    if parent:
        b.parent=parent
        b.use_connect=connect
    return b

# ------------------------------------------------------------
# SCENE
# ------------------------------------------------------------
col=ensure_collection(COLLECTION)
clear_collection(col)

skin=make_mat("ELARA_Skin",SKIN,0.73)
suit=make_mat("ELARA_BaseSuit",SUIT,0.84)
hair=make_mat("ELARA_Hair",HAIR,0.58)
hair_hi=make_mat("ELARA_HairHighlight",HAIR_HI,0.54)
eye_white=make_mat("ELARA_EyeWhite",EYE_WHITE,0.46)
iris=make_mat("ELARA_Iris",IRIS,0.36)
lash=make_mat("ELARA_Lash",LASH,0.65)
lip=make_mat("ELARA_Lip",LIP,0.60)

# ------------------------------------------------------------
# BODY — integrated torso/pelvis silhouette
# ------------------------------------------------------------
# y is depth. Positive Y is face/front.
body_rings=[
    (0.90,0.145,0.125,0.000), # upper inner pelvis
    (0.94,0.235,0.175,-0.004),
    (1.00,0.275,0.205,-0.008), # hip
    (1.07,0.245,0.180,-0.004),
    (1.13,0.165,0.135,0.004), # narrow waist
    (1.20,0.170,0.140,0.010),
    (1.29,0.205,0.165,0.018),
    (1.37,0.245,0.190,0.028), # lower chest
    (1.44,0.255,0.205,0.036), # bust line integrated, not separate spheres
    (1.50,0.235,0.180,0.022),
    (1.54,0.205,0.155,0.010),
]
body=make_loft("ELARA_Female_Body",body_rings,BODY_SEGMENTS,suit,col)
body["elara_role"]="body"
body["production_stage"]="blockout"

# chest volume integrated with a subtle front-only sculpt pass
# move front-side vertices forward around chest band while keeping sternum controlled.
for v in body.data.vertices:
    co=v.co
    if 1.32 <= co.z <= 1.49 and co.y > 0:
        zt=1.0-abs(co.z-1.415)/0.095
        zt=max(0.0,min(1.0,zt))
        side=abs(co.x)/0.255
        # volume peaks away from center, giving two natural masses without detached spheres
        breast=max(0.0,1.0-abs(side-0.55)/0.55)
        co.y += 0.060*zt*breast

# soften glute/back pelvis
for v in body.data.vertices:
    co=v.co
    if 0.94 <= co.z <= 1.08 and co.y < 0:
        zt=1.0-abs(co.z-1.01)/0.07
        co.y -= 0.028*max(0,zt)*(0.55+0.45*min(1,abs(co.x)/0.27))

# ------------------------------------------------------------
# LEGS
# ------------------------------------------------------------
for side,label in [(-1,"L"),(1,"R")]:
    xhip=0.158*side
    xknee=0.125*side
    xankle=0.095*side
    upper=add_capsule_between(
        f"ELARA_UpperLeg_{label}",
        (xhip,0.0,0.93),(xknee,0.0,0.55),
        0.125,0.088,suit,col
    )
    lower=add_capsule_between(
        f"ELARA_LowerLeg_{label}",
        (xknee,0.0,0.53),(xankle,0.005,0.14),
        0.082,0.055,suit,col
    )
    knee=add_uv_sphere(f"ELARA_Knee_{label}",(xknee,0,0.535),(0.083,0.072,0.078),suit,col,32,20)

    # foot + toe silhouette
    foot=make_loft(
        f"ELARA_Foot_{label}",
        [
            (0.00,0.050,0.090,0.080),
            (0.035,0.065,0.125,0.095),
            (0.075,0.070,0.115,0.080),
            (0.120,0.060,0.075,0.025),
        ],
        26,suit,col
    )
    foot.rotation_euler=(math.radians(90),0,0)
    foot.location=(xankle,0.035,0.075)
    foot.scale=(1.0,1.0,1.0)

# ------------------------------------------------------------
# NECK / SHOULDERS / ARMS
# ------------------------------------------------------------
neck=make_loft(
    "ELARA_Neck",
    [(1.51,0.073,0.064,0.008),(1.59,0.066,0.060,0.010),(1.64,0.061,0.057,0.012)],
    30,suit,col
)

for side,label in [(-1,"L"),(1,"R")]:
    shoulder=(0.242*side,0.0,1.515)
    elbow=(0.300*side,0.012,1.205)
    wrist=(0.310*side,0.020,0.965)
    add_uv_sphere(f"ELARA_Shoulder_{label}",shoulder,(0.084,0.077,0.085),suit,col,32,20)
    add_capsule_between(f"ELARA_UpperArm_{label}",shoulder,elbow,0.072,0.050,suit,col)
    add_uv_sphere(f"ELARA_Elbow_{label}",elbow,(0.052,0.047,0.052),suit,col,28,18)
    add_capsule_between(f"ELARA_Forearm_{label}",elbow,wrist,0.048,0.034,suit,col)
    hand=make_loft(
        f"ELARA_Hand_{label}",
        [(0.0,0.034,0.022,0.0),(0.06,0.040,0.026,0.004),(0.13,0.030,0.020,0.007),(0.17,0.018,0.014,0.010)],
        18,suit,col
    )
    hand.location=(wrist[0],wrist[1],wrist[2]-0.17)
    hand.rotation_euler=(0,0,0)

# ------------------------------------------------------------
# HEAD — anime/semi-real base, not a perfect sphere
# ------------------------------------------------------------
head=add_uv_sphere("ELARA_Female_Head",(0,0.005,HEAD_CENTER_Z),(0.235,0.205,0.285),skin,col,64,48)
head["elara_role"]="face"
head["production_stage"]="blockout"

# Sculpt-like vertex deformation in object local space.
for v in head.data.vertices:
    x,y,z=v.co.x,v.co.y,v.co.z
    nz=z/0.285
    # jaw/chin taper
    if nz < 0.05:
        t=min(1.0,max(0.0,(-nz)/0.80))
        v.co.x *= (1.0-0.28*t)
        # keep chin projected slightly forward
        v.co.y += 0.010*t
    # flatter face plane
    if y > 0.0:
        v.co.y *= 0.92
    # cheek width around middle/lower face
    if -0.35 < nz < 0.15:
        v.co.x *= 1.035
    # narrower temples/top
    if nz > 0.55:
        v.co.x *= 0.96

add_shape_key_scaffold(head)

# ears
for side,label in [(-1,"L"),(1,"R")]:
    ear=add_uv_sphere(f"ELARA_Ear_{label}",(0.235*side,-0.008,1.785),(0.028,0.018,0.052),skin,col,28,18)

# ------------------------------------------------------------
# EYES / LASHES / BROWS / MOUTH
# ------------------------------------------------------------
for side,label in [(-1,"L"),(1,"R")]:
    ex=0.073*side
    ey=0.186
    ez=1.805
    eye=add_uv_sphere(f"ELARA_Eye_{label}",(ex,ey,ez),(0.063,0.025,0.041),eye_white,col,40,24)
    ir=add_uv_sphere(f"ELARA_Iris_{label}",(ex,ey+0.025,ez),(0.026,0.007,0.026),iris,col,32,20)
    # upper lash curve
    add_curve_hair(
        f"ELARA_Lash_{label}",
        [
            (ex-0.045*side,ey+0.045,ez+0.012),
            (ex,ey+0.051,ez+0.024),
            (ex+0.047*side,ey+0.044,ez+0.010),
        ],0.006,lash,col
    )
    # brow
    add_curve_hair(
        f"ELARA_Brow_{label}",
        [
            (ex-0.052*side,ey+0.010,ez+0.080),
            (ex,ey+0.017,ez+0.090),
            (ex+0.050*side,ey+0.008,ez+0.078),
        ],0.005,hair,col
    )

# subtle nose bridge/tip using a tiny sculpt base
nose=make_loft(
    "ELARA_Nose_Blockout",
    [(0.0,0.026,0.020,0.0),(0.055,0.022,0.024,0.006),(0.115,0.016,0.018,0.009)],
    18,skin,col
)
nose.location=(0,0.198,1.745)
nose.rotation_euler=(math.radians(90),0,0)

# lips as two fine curves
add_curve_hair("ELARA_UpperLip",[(-0.041,0.201,1.688),(0,0.207,1.682),(0.041,0.201,1.688)],0.006,lip,col)
add_curve_hair("ELARA_LowerLip",[(-0.036,0.201,1.678),(0,0.209,1.673),(0.036,0.201,1.678)],0.005,lip,col)

# ------------------------------------------------------------
# HAIR GUIDE SYSTEM
# These curves are intentionally better art guides than website ribbons,
# but still must be converted/refined into final production clumps/cards.
# ------------------------------------------------------------
hair_paths=[
    # top / crown
    [(-0.04,-0.02,2.05),(-0.15,0.05,1.98),(-0.18,0.10,1.86),(-0.15,0.10,1.69)],
    [(0.03,-0.02,2.06),(0.13,0.05,1.99),(0.17,0.10,1.86),(0.14,0.10,1.68)],
    # front framing
    [(-0.02,0.10,2.04),(-0.07,0.17,1.96),(-0.10,0.18,1.84),(-0.08,0.19,1.70)],
    [(0.02,0.10,2.04),(0.08,0.17,1.96),(0.12,0.18,1.84),(0.10,0.19,1.70)],
    # side layers
    [(-0.18,0.02,1.99),(-0.24,0.06,1.88),(-0.24,0.02,1.72),(-0.20,-0.01,1.58)],
    [(0.18,0.02,1.99),(0.24,0.06,1.88),(0.24,0.02,1.72),(0.20,-0.01,1.58)],
    # back mass
    [(-0.14,-0.12,2.01),(-0.20,-0.18,1.89),(-0.19,-0.20,1.71),(-0.13,-0.17,1.56)],
    [(0.00,-0.15,2.04),(0.00,-0.23,1.90),(0.00,-0.25,1.72),(0.00,-0.20,1.54)],
    [(0.14,-0.12,2.01),(0.20,-0.18,1.89),(0.19,-0.20,1.71),(0.13,-0.17,1.56)],
]
for i,path in enumerate(hair_paths):
    mat=hair_hi if i in (2,3) else hair
    c=add_curve_hair(f"ELARA_HairGuide_{i+1:02d}",path,0.032 if i<4 else 0.038,mat,col)
    c["elara_hair_region"]="front" if i<4 else ("side" if i<6 else "back")
    c["physics_candidate"]=True

# ------------------------------------------------------------
# RIG SCAFFOLD
# ------------------------------------------------------------
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
rig=bpy.context.object
rig.name="ELARA_Rig_Scaffold"
link_only(rig,col)
arm=rig.data
# remove default bone
for b in list(arm.edit_bones):
    arm.edit_bones.remove(b)

hips=add_bone(rig,"hips",(0,0,0.92),(0,0,1.04))
spine=add_bone(rig,"spine",(0,0,1.04),(0,0,1.25),hips,True)
chest=add_bone(rig,"chest",(0,0,1.25),(0,0,1.46),spine,True)
neck_b=add_bone(rig,"neck",(0,0,1.46),(0,0,1.62),chest,True)
head_b=add_bone(rig,"head",(0,0,1.62),(0,0,1.91),neck_b,True)

for side,label in [(-1,"L"),(1,"R")]:
    ua=add_bone(rig,f"upperArm_{label}",(0.05*side,0,1.46),(0.26*side,0,1.42),chest,False)
    la=add_bone(rig,f"lowerArm_{label}",(0.26*side,0,1.42),(0.30*side,0,1.20),ua,False)
    hand_b=add_bone(rig,f"hand_{label}",(0.30*side,0,1.20),(0.31*side,0,0.99),la,False)
    ul=add_bone(rig,f"upperLeg_{label}",(0.12*side,0,0.94),(0.125*side,0,0.55),hips,False)
    ll=add_bone(rig,f"lowerLeg_{label}",(0.125*side,0,0.55),(0.095*side,0,0.14),ul,False)
    ft=add_bone(rig,f"foot_{label}",(0.095*side,0,0.14),(0.095*side,0.16,0.08),ll,False)

bpy.ops.object.mode_set(mode='OBJECT')
rig["elara_rig_status"]="scaffold_only"
rig["vrm_humanoid_target"]=True

# ------------------------------------------------------------
# FLOOR / CAMERA / LIGHT
# ------------------------------------------------------------
bpy.ops.mesh.primitive_plane_add(size=4, location=(0,0,0))
floor=bpy.context.object
floor.name="ELARA_Blockout_Floor"
link_only(floor,col)
floor_mat=make_mat("ELARA_Floor",(0.12,0.13,0.16,1),0.92)
floor.data.materials.append(floor_mat)

# Camera
bpy.ops.object.camera_add(location=(0,4.4,1.45), rotation=(math.radians(82),0,math.radians(180)))
cam=bpy.context.object
cam.name="ELARA_Blockout_Camera"
link_only(cam,col)
bpy.context.scene.camera=cam

# Point camera toward upper torso/face
def track_to(obj, target):
    direction=Vector(target)-obj.location
    obj.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()

track_to(cam,(0,0,1.05))
cam.data.lens=62

# Lights
bpy.ops.object.light_add(type='AREA', location=(1.8,2.6,3.0))
key=bpy.context.object; key.name="ELARA_Key"; link_only(key,col); key.data.energy=900; key.data.shape='DISK'; key.data.size=2.2
track_to(key,(0,0,1.25))

bpy.ops.object.light_add(type='AREA', location=(-1.8,1.4,2.3))
fill=bpy.context.object; fill.name="ELARA_Fill"; link_only(fill,col); fill.data.energy=500; fill.data.size=2.6
track_to(fill,(0,0,1.25))

bpy.ops.object.light_add(type='AREA', location=(0,-2.0,2.6))
rim=bpy.context.object; rim.name="ELARA_Rim"; link_only(rim,col); rim.data.energy=700; rim.data.size=2.0
track_to(rim,(0,0,1.45))

# ------------------------------------------------------------
# METADATA / VIEW
# ------------------------------------------------------------
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1.0
scene["elara_avatar_pipeline"]="production-v1"
scene["elara_model"]="female"
scene["elara_blockout_version"]="1.0"
scene["elara_art_direction"]="2026-10-05-approved-turnaround"
scene["elara_note"]="Blockout only. Final production requires sculpt + retopo + final hair + weights + morph sculpt."

# Viewport/render
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1200
scene.render.resolution_y=1600
scene.render.resolution_percentage=70

# Select body + head for the artist.
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
head.select_set(True)
bpy.context.view_layer.objects.active=head

print("")
print("============================================")
print("ELARA FEMALE PRODUCTION BLOCKOUT v1 CREATED")
print("============================================")
print("Created:")
print(" - integrated torso/pelvis blockout")
print(" - long anime-fashion legs/arms")
print(" - refined anime/semi-real head base")
print(" - separate eyes / iris / lashes / brows / lips")
print(" - layered hair GUIDE curves")
print(" - humanoid rig scaffold")
print(" - facial shape-key scaffold")
print(" - camera + studio light")
print("")
print("IMPORTANT: This is a production BLOCKOUT, not the final model.")
print("Next checkpoint: sculpt the Female face and body against the approved turnaround.")
