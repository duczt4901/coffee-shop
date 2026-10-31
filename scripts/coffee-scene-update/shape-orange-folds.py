"""Sculpt broad, paired ridge/trough folds into the existing orange quad cage.

Usage: python shape-orange-folds.py before.glb quad-source.json source.obj output-dir
"""
import importlib.util
from pathlib import Path
import sys

import numpy as np

spec = importlib.util.spec_from_file_location('quad_export', Path(__file__).with_name('soften-orange-quads.py'))
export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export)
ramp = export.io.ramp


def ridge_trough(distance, width):
    # A rounded depression plus its displaced material, rather than a sharp spike.
    return -np.exp(-.5*(distance/width)**2) + .48*np.exp(-.5*((distance+width*1.65)/(width*1.3))**2)


def sculpt(before, topology):
    rows = np.asarray(topology['rows'])
    columns = (len(topology['frontColumnsUV']) + len(topology['gussetDepthStations']) - 2)*2
    assert len(rows) == 65 and columns == 84
    count = len(rows)*columns
    cage = before[:count].reshape(len(rows), columns, 3).astype(float)
    y = cage[:, :, 1]
    x = cage[:, :, 0]
    z = np.clip(cage[:, :, 2], -1, 1)
    side = abs(z)
    asymmetry = np.where(z > 0, .035, -.025)
    shoulder = ramp(2.14, 2.36, y)*(1-ramp(3.12, 3.24, y))
    bottom = ramp(.055, .15, y)*(1-ramp(.64, .84, y))
    relief = .083*ridge_trough(y-(2.55+.45*side+asymmetry), .085)
    relief += .050*ridge_trough(y-(2.94+.16*side-.025*z), .075)*ramp(.22, .8, side)
    relief += .030*ridge_trough(y-(2.46+.18*side+.10*z), .070)*ramp(.42, .85, side)
    relief *= shoulder*(.35+.65*ramp(.12, .75, side))
    relief += .056*ridge_trough(y-(.22+.30*(1-side)+.035*z), .085)*bottom*ramp(.20, .83, side)
    relief += .027*ridge_trough(y-(.51+.15*(1-side)-.03*z), .075)*bottom*ramp(.45, .9, side)
    # Broad gusset buckles join the face folds without gathering the side to a point.
    across = np.clip(x, -1, 1)
    side_relief = .035*ridge_trough(y-(2.78+.24*abs(across)), .12)*shoulder
    side_relief += .028*ridge_trough(y-(.31+.17*abs(across)), .11)*bottom
    relief *= .82+.18*ramp(-.20, .20, x)
    relief *= 1.85*(1-.60*ramp(.86, .998, side))
    # Use a continuous spatial warp; noisy corner normals can make dense strips cross.
    delta = np.stack([np.tanh(x/.18)*relief,
                      np.tanh(z/.18)*side_relief*ramp(.55, .95, side)], axis=-1)
    assert np.linalg.norm(delta, axis=-1).max() < .19
    after = before.copy()
    shaped = cage.copy()
    shaped[:, :, 0] += delta[:, :, 0]
    shaped[:, :, 2] += delta[:, :, 1]
    after[:count] = shaped.reshape(-1, 3)
    return after


if __name__ == '__main__':
    export.export_deformation(*map(Path, sys.argv[1:5]), sculpt)
