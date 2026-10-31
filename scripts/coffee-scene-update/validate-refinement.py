"""Validate asset preservation and compare local triangle crossings before/after refinement."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

import numpy as np

spec = importlib.util.spec_from_file_location('refine', Path(__file__).with_name('refine-geometry.py'))
refine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refine)


def crossing_pairs(points, faces, changed):
    """BVH broad phase + finite segment/triangle tests, ignoring shared-vertex contacts.

    Existing coplanar zipper contacts are compared through closure/seam checks instead;
    this test detects new non-coplanar crossings around changed geometry.
    """
    triangles = points[faces]
    normal = np.cross(triangles[:, 1]-triangles[:, 0], triangles[:, 2]-triangles[:, 0])
    valid = np.linalg.norm(normal, axis=1) > 1e-10
    minimum, maximum = triangles.min(axis=1), triangles.max(axis=1)
    centroids = (minimum + maximum) / 2
    _, welded = np.unique(np.round(points, 5), axis=0, return_inverse=True)
    welded_faces = welded[faces]
    nodes = []

    def build(ids):
        index = len(nodes)
        lo, hi = minimum[ids].min(0), maximum[ids].max(0)
        nodes.append((lo, hi, ids, None, None))
        if len(ids) > 16:
            axis = np.ptp(centroids[ids], axis=0).argmax()
            order = ids[np.argsort(centroids[ids, axis])]
            mid = len(ids)//2
            left, right = build(order[:mid]), build(order[mid:])
            nodes[index] = (lo, hi, ids, left, right)
        return index

    build(np.flatnonzero(valid))
    hits, candidates = set(), 0

    def segment_hits(starts, ends, target):
        direction = ends-starts
        edge1, edge2 = target[:, 1]-target[:, 0], target[:, 2]-target[:, 0]
        h = np.cross(direction, edge2)
        determinant = (edge1*h).sum(axis=1)
        ok = np.abs(determinant) > 1e-12
        inv = np.divide(1, determinant, out=np.zeros_like(determinant), where=ok)
        s = starts-target[:, 0]
        u = inv*(s*h).sum(axis=1)
        q = np.cross(s, edge1)
        v = inv*(direction*q).sum(axis=1)
        t = inv*(edge2*q).sum(axis=1)
        return ok & (u > 1e-7) & (v > 1e-7) & (u+v < 1-1e-7) & (t > 1e-7) & (t < 1-1e-7)

    def test(a, b):
        nonlocal candidates
        ia, ib = np.meshgrid(a, b, indexing='ij')
        ia, ib = ia.ravel(), ib.ravel()
        keep = (ia < ib) & (changed[ia] | changed[ib])
        keep &= np.all(minimum[ia] <= maximum[ib] + 1e-9, axis=1)
        keep &= np.all(minimum[ib] <= maximum[ia] + 1e-9, axis=1)
        ia, ib = ia[keep], ib[keep]
        if not len(ia):
            return
        shared = (welded_faces[ia, :, None] == welded_faces[ib, None, :]).any(axis=(1, 2))
        ia, ib = ia[~shared], ib[~shared]
        if not len(ia):
            return
        candidates += len(ia)
        ta, tb = triangles[ia], triangles[ib]
        found = np.zeros(len(ia), bool)
        for j in range(3):
            found |= segment_hits(ta[:, j], ta[:, (j+1)%3], tb)
            found |= segment_hits(tb[:, j], tb[:, (j+1)%3], ta)
        hits.update(zip(ia[found].tolist(), ib[found].tolist()))

    def walk(a, b):
        lo, hi, ids, left, right = nodes[a]
        blo, bhi, bids, bleft, bright = nodes[b]
        if np.any(lo > bhi + 1e-9) or np.any(blo > hi + 1e-9):
            return
        if not changed[ids].any() and not changed[bids].any():
            return
        if a == b:
            if left is None:
                test(ids, bids)
            else:
                walk(left, left)
                walk(left, right)
                walk(right, right)
        elif left is None and bleft is None:
            test(ids, bids)
            # Different BVH leaves have arbitrary face-index ordering.
            test(bids, ids)
        elif bleft is None or (left is not None and len(ids) >= len(bids)):
            walk(left, b)
            walk(right, b)
        else:
            walk(a, bleft)
            walk(a, bright)

    walk(0, 0)
    return hits, candidates


def accessor_bytes(gltf, binary, index):
    return refine.read(gltf, binary, index).tobytes()


def image_hashes(gltf, binary):
    result = []
    for image in gltf['images']:
        view = gltf['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        result.append(hashlib.sha256(binary[start:start+view['byteLength']]).hexdigest())
    return result


def main():
    before, after, destination = map(Path, sys.argv[1:4])
    a, ab, adata = refine.load(before)
    b, bb, bdata = refine.load(after)
    for key in ('nodes', 'scenes', 'materials', 'textures', 'images', 'samplers', 'extensionsUsed', 'extensionsRequired'):
        assert a.get(key) == b.get(key), key
    assert image_hashes(a, ab) == image_hashes(b, bb)
    report = {'sourceSHA256': hashlib.sha256(adata).hexdigest(), 'outputSHA256': hashlib.sha256(bdata).hexdigest(),
              'imagesByteIdentical': True, 'materialsByteEquivalent': True,
              'sceneAndTransformsUnchanged': True, 'meshes': []}
    for ma, mb in zip(a['meshes'], b['meshes']):
        is_bag = ma.get('name', '').startswith('Bag_')
        if not is_bag:
            assert ma == mb
            for p in ma['primitives']:
                for index in list(p['attributes'].values()) + [p['indices']]:
                    assert accessor_bytes(a, ab, index) == accessor_bytes(b, bb, index)
            continue
        attrs = ma['primitives'][0]['attributes']
        pa, pb = refine.read(a, ab, attrs['POSITION']).astype(float), refine.read(b, bb, attrs['POSITION']).astype(float)
        na, nb = refine.read(a, ab, attrs['NORMAL']).astype(float), refine.read(b, bb, attrs['NORMAL']).astype(float)
        assert np.isfinite(pb).all() and np.isfinite(nb).all()
        assert np.max(abs(np.linalg.norm(nb, axis=1)-1)) < 1e-5
        assert accessor_bytes(a, ab, attrs['TEXCOORD_0']) == accessor_bytes(b, bb, attrs['TEXCOORD_0'])
        fa = np.concatenate([refine.read(a, ab, p['indices']).reshape(-1, 3) for p in ma['primitives']]).astype(int)
        fb = np.concatenate([refine.read(b, bb, p['indices']).reshape(-1, 3) for p in mb['primitives']]).astype(int)
        uv = refine.read(a, ab, attrs['TEXCOORD_0']).astype(float)
        for old_p, new_p in zip(ma['primitives'], mb['primitives']):
            assert old_p['material'] == new_p['material'] and old_p['attributes'] == new_p['attributes']
            old_uv = uv[refine.read(a, ab, old_p['indices']).reshape(-1, 3)]
            new_uv = uv[refine.read(b, bb, new_p['indices']).reshape(-1, 3)]
            def uv_area(t):
                d, e = t[:, 1]-t[:, 0], t[:, 2]-t[:, 0]
                return (d[:, 0]*e[:, 1]-d[:, 1]*e[:, 0]).sum()/2
            assert abs(uv_area(old_uv)-uv_area(new_uv)) < 2e-7, 'Material UV coverage changed'
        moved = np.linalg.norm(pb-pa, axis=1) > 1e-7
        old_set, new_set = set(map(tuple, fa)), set(map(tuple, fb))
        old_changed = moved[fa].any(axis=1) | np.asarray([tuple(f) not in new_set for f in fa])
        new_changed = moved[fb].any(axis=1) | np.asarray([tuple(f) not in old_set for f in fb])
        old_hits, old_candidates = crossing_pairs(pa, fa, old_changed)
        new_hits, new_candidates = crossing_pairs(pb, fb, new_changed)
        # A rotated diagonal can rename a contact; geometric contacts are checked before acceptance.
        new_only = sorted(new_hits-old_hits)
        entry = {'mesh': ma['name'], 'before': refine.stats(pa, fa), 'after': refine.stats(pb, fb),
                 'uvByteIdentical': True, 'materialUVCoverageUnchanged': True,
                 'normalsChanged': int((np.linalg.norm(nb-na, axis=1)>1e-7).sum()),
                 'crossingPairsInEditedRegionBefore': len(old_hits), 'crossingPairsInEditedRegionAfter': len(new_hits),
                 'newCrossingFacePairs': new_only, 'testedCandidatePairsBefore': old_candidates,
                 'testedCandidatePairsAfter': new_candidates}
        report['meshes'].append(entry)
        print(json.dumps({k: v for k, v in entry.items() if k != 'newCrossingFacePairs'}
                         | {'newCrossingFacePairsCount': len(new_only)}), flush=True)
    report['allNonBagGeometryByteIdentical'] = True
    report['crossingCheckLimit'] = 'Non-coplanar strict-interior triangle crossings near edited geometry; coincident seams checked separately by welded edge counts.'
    destination.write_text(json.dumps(report, indent=2), encoding='utf-8')
    assert all(not m['newCrossingFacePairs'] for m in report['meshes']), 'New local crossing pairs; inspect report before accepting asset'


if __name__ == '__main__':
    main()
