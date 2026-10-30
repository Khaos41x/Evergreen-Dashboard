"""Digitize the existing tree into XYZ geometry, not a runtime image.

X/Y and intensity preserve the supplied silhouette. Z is a deterministic
reconstruction: the repository contains no original depth/model information.
No original image bytes are changed. Runtime uses only the binary geometry.
"""
from pathlib import Path
from PIL import Image
import hashlib, math, struct, json

root = Path(__file__).resolve().parents[1]
source = root / 'public/evergreen-tree.png'
img = Image.open(source).convert('RGB').resize((768, 768))
points = bytearray()
for y in range(768):
    for x in range(768):
        pixel = img.getpixel((x, y))
        intensity = max(pixel)
        if intensity < 37:
            continue
        # Dark texture is sparsified; bright branches retain their contour.
        seed = ((x * 73856093) ^ (y * 19349663)) & 0xffffffff
        if intensity < 95 and seed % 3:
            continue
        nx, ny = (x / 767 - .5) * 2, (.5 - y / 767) * 2
        depth = math.sqrt(max(0, 1 - (nx / .95) ** 2)) * .18
        nz = depth * math.sin(seed * .00001) * (.55 if y > 600 else 1)
        points += struct.pack('<hhhH', round(nx * 32767), round(ny * 32767), round(nz * 32767), intensity * 257)
output = root / 'public/evergreen-tree.geometry.bin'
output.write_bytes(points)
meta = {'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'points': len(points)//8,
        'stride_bytes': 8, 'encoding': 'little-endian int16 x,y,z; uint16 intensity',
        'depth': 'Reconstructed from a 2D reference, not the original 3D model',
        'runtime_raster': False}
(root / 'public/evergreen-tree.geometry.json').write_text(json.dumps(meta, indent=2), encoding='utf8')
print(json.dumps(meta))
