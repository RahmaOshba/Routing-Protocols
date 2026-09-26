# Illustrated concept figure of the proposed protocol (v8 / v8-Chain) -> fig/v8_concept.png
import os
import numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge, FancyBboxPatch, Circle, Ellipse, Polygon, Rectangle, FancyArrowPatch, Arc, PathPatch
from matplotlib.path import Path

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'fig')
INK, MUTED, NAVY = '#26282b', '#6b6a66', '#14213d'
GREEN, CHC, MEMC, ORANGE, BLUE, PURPLE, RED, GOLD = '#3f8f3a', '#1e8a4c', '#4a5058', '#e07b24', '#2a78d6', '#7b4bc4', '#d64541', '#f2b800'
W, H = 17.0, 9.2
fig = plt.figure(figsize=(W, H)); ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis('off')
rng = np.random.default_rng(11)

def smooth_blob(cx, cy, rx, ry, seed, n=9, amp=0.12):
    r = np.random.default_rng(seed); t = np.linspace(0, 2 * np.pi, 400)
    k = np.arange(1, 4); ph = r.uniform(0, 2 * np.pi, 3); am = r.uniform(0.3, 1, 3) * amp
    f = 1 + sum(am[i] * np.sin(k[i] * t + ph[i]) for i in range(3))
    return np.c_[cx + rx * f * np.cos(t), cy + ry * f * np.sin(t)]
def arrow(a, b, c=MUTED, lw=1.6, ls='-', ms=14, rad=0.0, z=6):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle='-|>', mutation_scale=ms, color=c, lw=lw, linestyle=ls, shrinkA=6, shrinkB=8, zorder=z,
                                 connectionstyle=f'arc3,rad={rad}'))
def tree(x, y, s=1.0, pine=False):
    ax.add_patch(Rectangle((x - 0.05 * s, y), 0.1 * s, 0.28 * s, color='#8a5a3c', zorder=2))
    if pine:
        for k in range(3):
            ax.add_patch(Polygon([[x - (0.32 - k * 0.07) * s, y + (0.2 + k * 0.2) * s], [x + (0.32 - k * 0.07) * s, y + (0.2 + k * 0.2) * s], [x, y + (0.55 + k * 0.2) * s]], color=['#3f8f3a', '#4c9c44', '#5aab4f'][k], zorder=2))
    else:
        for dx, dy, r in [(0, 0.5, 0.27), (-0.17, 0.38, 0.2), (0.17, 0.38, 0.2)]:
            ax.add_patch(Circle((x + dx * s, y + dy * s), r * s, color='#5aab4f', zorder=2))
def bush(x, y, s=1.0):
    for dx, r in [(-0.1, 0.09), (0.0, 0.12), (0.11, 0.08)]:
        ax.add_patch(Circle((x + dx * s, y + 0.06 * s), r * s, color='#86c26e', zorder=2))
def sensor(x, y, kind='member', s=1.0, label=None):
    body = {'member': '#50565e', 'ch': CHC, 'low': '#9a9a96', 'backup': '#50565e'}[kind]
    w, h = 0.34 * s, 0.26 * s
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle=f'round,pad=0.01,rounding_size={0.06 * s}', fc=body, ec='white', lw=1.2, zorder=8))
    ax.add_patch(FancyBboxPatch((x - w / 2 + 0.05 * s, y - h / 2 + 0.06 * s), 0.12 * s, 0.1 * s, boxstyle='round,pad=0.005,rounding_size=0.02', fc='#c9ced4', ec='none', zorder=9))
    ax.add_patch(Circle((x + w / 2 - 0.07 * s, y), 0.03 * s, color='#7ee07a' if kind != 'low' else '#e34948', zorder=9))
    ax.plot([x + 0.08 * s, x + 0.08 * s], [y + h / 2, y + h / 2 + 0.2 * s], color='#3a3f45', lw=1.6 * s, zorder=8)
    ax.add_patch(Circle((x + 0.08 * s, y + h / 2 + 0.21 * s), 0.025 * s, color='#3a3f45', zorder=8))
    if kind == 'ch':
        ax.add_patch(Polygon([[x - 0.14 * s, y + h / 2 + 0.06 * s], [x - 0.14 * s, y + h / 2 + 0.2 * s], [x - 0.08 * s, y + h / 2 + 0.12 * s], [x - 0.02 * s, y + h / 2 + 0.2 * s],
                              [x + 0.04 * s, y + h / 2 + 0.12 * s], [x + 0.04 * s, y + h / 2 + 0.06 * s]], color=GOLD, zorder=9))
    if kind == 'low':
        ax.add_patch(Rectangle((x - 0.13 * s, y + h / 2 + 0.05 * s), 0.2 * s, 0.1 * s, fill=False, ec=RED, lw=1, zorder=9))
        ax.add_patch(Rectangle((x - 0.12 * s, y + h / 2 + 0.06 * s), 0.04 * s, 0.08 * s, color=RED, zorder=9))
    if kind == 'backup':
        ax.add_patch(Polygon([[x - 0.2 * s, y + h / 2 + 0.2 * s], [x - 0.06 * s, y + h / 2 + 0.2 * s], [x - 0.06 * s, y + h / 2 + 0.08 * s], [x - 0.13 * s, y + h / 2 + 0.01 * s],
                              [x - 0.2 * s, y + h / 2 + 0.08 * s]], color=PURPLE, zorder=9))
    if label:
        ax.text(x, y - h / 2 - 0.08, label, ha='center', va='top', fontsize=9.5, color=INK, fontweight='bold', zorder=9)
def tower(x, y, s=1.0, c='#3a3f45'):
    hgt, bw = 2.0 * s, 0.55 * s
    ax.add_patch(Polygon([[x - bw / 2, y], [x + bw / 2, y], [x + 0.06 * s, y + hgt], [x - 0.06 * s, y + hgt]], fill=False, ec=c, lw=2.4, zorder=5))
    for k in range(1, 6):
        yy = y + hgt * k / 6; half = bw / 2 - (bw / 2 - 0.06 * s) * k / 6; yy0 = y + hgt * (k - 1) / 6; half0 = bw / 2 - (bw / 2 - 0.06 * s) * (k - 1) / 6
        ax.plot([x - half0, x + half], [yy0, yy], color=c, lw=1.2, zorder=5); ax.plot([x + half0, x - half], [yy0, yy], color=c, lw=1.2, zorder=5)
        ax.plot([x - half, x + half], [yy, yy], color=c, lw=1.2, zorder=5)
    ax.add_patch(Rectangle((x - bw / 2 - 0.15 * s, y - 0.08 * s), bw + 0.3 * s, 0.1 * s, color='#9aa0a6', zorder=5))
    ax.add_patch(Circle((x, y + hgt + 0.1 * s), 0.1 * s, color=BLUE, zorder=6))
    for rr in (0.25, 0.42, 0.6):
        ax.add_patch(Arc((x, y + hgt + 0.1 * s), 2 * rr * s, 2 * rr * s, theta1=-40, theta2=40, color=BLUE, lw=2.2, zorder=6))
        ax.add_patch(Arc((x, y + hgt + 0.1 * s), 2 * rr * s, 2 * rr * s, theta1=140, theta2=220, color=BLUE, lw=2.2, zorder=6))
def cloud(x, y, s=1.0):
    for dx, dy, r in [(-0.45, 0, 0.32), (0, 0.18, 0.42), (0.45, 0, 0.32), (0.2, -0.05, 0.33), (-0.2, -0.05, 0.33)]:
        ax.add_patch(Circle((x + dx * s, y + dy * s), r * s, fc='white', ec='#8fb3e0', lw=2, zorder=5))
    for dx, dy, r in [(-0.45, 0, 0.3), (0, 0.18, 0.4), (0.45, 0, 0.3), (0.2, -0.05, 0.31), (-0.2, -0.05, 0.31)]:
        ax.add_patch(Circle((x + dx * s, y + dy * s), r * s, fc='white', ec='none', zorder=6))
    ax.text(x, y + 0.03, 'Internet', ha='center', va='center', fontsize=13, color=INK, zorder=7)
def monitor(x, y, s=1.0):
    ax.add_patch(FancyBboxPatch((x - 0.85 * s, y), 1.7 * s, 1.1 * s, boxstyle='round,pad=0.02,rounding_size=0.08', fc='#3a3f45', zorder=5))
    ax.add_patch(Rectangle((x - 0.76 * s, y + 0.1 * s), 1.52 * s, 0.9 * s, color='white', zorder=6))
    for k, hh in enumerate([0.3, 0.5, 0.4, 0.65]):
        ax.add_patch(Rectangle((x - 0.66 * s + k * 0.17 * s, y + 0.2 * s), 0.12 * s, hh * s, color=['#8fb3e0', BLUE, '#8fb3e0', BLUE][k], zorder=7))
    ax.add_patch(Circle((x + 0.4 * s, y + 0.55 * s), 0.25 * s, color=ORANGE, zorder=7))
    ax.add_patch(Wedge((x + 0.4 * s, y + 0.55 * s), 0.25 * s, 0, 90, color='#f2c200', zorder=8))
    ax.add_patch(Polygon([[x - 0.15 * s, y], [x + 0.15 * s, y], [x + 0.25 * s, y - 0.3 * s], [x - 0.25 * s, y - 0.3 * s]], color='#3a3f45', zorder=5))

# ── title
ax.text(0.4, H - 0.45, 'Proposed protocol v8 / v8-Chain — how it works', fontsize=22, fontweight='bold', color=NAVY, va='center')
ax.text(0.4, H - 0.95, 'Sensors form clusters, the best-placed nodes with enough energy lead them, and every reading reaches the user with as little energy as possible',
        fontsize=12, color=MUTED, va='center', style='italic')

# ── sensor field
FX, FY, FRX, FRY = 4.6, 4.75, 4.25, 2.55
b = smooth_blob(FX, FY, FRX, FRY, 4, amp=0.07)
ax.add_patch(Polygon(b, closed=True, fc='#eaf4df', ec='#a9cf8a', lw=2.2, zorder=1))
ax.text(FX - 0.2, FY - FRY - 0.18, 'Sensor field (random deployment)', ha='center', va='top', fontsize=13, color=GREEN, fontweight='bold')
for x, y, s, p in [(1.05, 4.1, 0.9, False), (1.55, 6.3, 0.8, True), (7.7, 6.3, 0.75, False), (8.2, 3.6, 0.85, True), (1.9, 2.75, 0.6, False)]:
    tree(x, y, s, p)
for x, y in [(2.9, 2.55), (6.1, 6.9), (3.3, 6.95), (7.1, 2.6), (5.6, 4.35), (1.4, 5.2)]:
    bush(x, y, 1.0)
ax.add_patch(Ellipse((6.15, 2.95), 0.9, 0.34, color='#a8d4f0', zorder=2))

# clusters: (centre, CH position, members, tint)
CL = [((2.75, 5.35), [(2.0, 5.9), (2.2, 4.75), (3.45, 6.1), (3.55, 4.8), (2.7, 6.35)], '#d9ecff'),
      ((5.05, 5.85), [(4.35, 6.45), (5.7, 6.5), (4.3, 5.35), (5.85, 5.25)], '#fde6cf'),
      ((4.1, 3.55), [(3.3, 3.1), (3.25, 4.1), (4.9, 3.05), (4.75, 4.2)], '#e6dcf7'),
      ((6.9, 4.45), [(6.25, 5.1), (7.55, 5.05), (6.35, 3.75)], '#d8f0dc')]
for (cx, cy), mem, tint in CL:
    xs = [p[0] for p in mem] + [cx]; ys = [p[1] for p in mem] + [cy]
    ax.add_patch(Ellipse((np.mean(xs), np.mean(ys)), (max(xs) - min(xs)) + 0.9, (max(ys) - min(ys)) + 0.85, fc=tint, ec='#8a8f96', ls='--', lw=1.3, alpha=0.85, zorder=3))
for (cx, cy), mem, tint in CL:
    for (mx, my) in mem:
        arrow((mx, my), (cx, cy), c='#5b8fd6', lw=1.3, ls='--', ms=11, z=7)
        sensor(mx, my, 'member', 0.9)
    sensor(cx, cy, 'ch', 1.25)
# special nodes
sensor(2.2, 4.75, 'low', 0.9)            # low battery member (can't be CH)
sensor(3.45, 6.1, 'backup', 0.9)         # backup of cluster 1
sensor(7.55, 5.05, 'member', 0.9)

# BS and far-away path
BSX, BSY = 10.3, 3.2
tower(BSX, BSY, 1.15)
ax.text(BSX, BSY - 0.3, 'Sink / Base Station', ha='center', va='top', fontsize=13.5, color=INK, fontweight='bold')
# CH -> BS arrows (direct), and relay 1 -> 2 (energy-aware)
arrow((6.9, 4.45), (BSX - 0.35, BSY + 1.3), c=NAVY, lw=2.2, ms=16, rad=-0.05)
arrow((4.1, 3.55), (BSX - 0.35, BSY + 1.0), c=NAVY, lw=2.2, ms=16, rad=0.12)
arrow((5.05, 5.85), (BSX - 0.3, BSY + 1.6), c=NAVY, lw=2.2, ms=16, rad=-0.12)
arrow((2.75, 5.35), (5.05, 5.85), c=BLUE, lw=2.4, ms=16, rad=-0.25)
# direct-to-BS member
arrow((7.55, 5.05), (BSX - 0.3, BSY + 1.85), c=ORANGE, lw=1.8, ls='--', ms=13, rad=-0.15)
# internet + user
cloud(12.75, 5.1, 1.0)
monitor(15.4, 4.55, 1.0)
ax.text(15.4, 4.05, 'User / Application', ha='center', va='top', fontsize=13.5, color=INK, fontweight='bold')
arrow((BSX + 0.45, BSY + 1.6), (12.05, 5.0), c=INK, lw=2, ms=16)
arrow((13.45, 5.1), (14.5, 5.1), c=INK, lw=2, ms=16)

# callouts
def note(x, y, text, c, target=None, ha='left'):
    t = ax.text(x, y, text, ha=ha, va='center', fontsize=10.5, color=c, fontweight='bold', zorder=12,
                bbox=dict(boxstyle='round,pad=0.35', fc='white', ec=c, lw=1.2))
    if target:
        ax.add_patch(FancyArrowPatch(target[0], target[1], arrowstyle='-', color=c, lw=1.2, linestyle=':', zorder=11, shrinkA=0, shrinkB=10))
note(0.2, 7.45, 'CH = most energy & neighbours,\nin its LEACH turn (one step, no negotiation)', CHC, ((1.6, 7.2), (2.75, 5.35)))
note(0.2, 3.55, 'Low battery →\ncannot become CH', RED, ((1.0, 3.85), (2.2, 4.75)))
note(3.0, 7.95, 'Backup: takes over if the CH weakens', PURPLE, ((3.4, 7.75), (3.45, 6.3)))
note(5.9, 7.55, 'Relay CH → CH only if it is cheaper (v8-Chain)', BLUE, ((6.2, 7.35), (3.9, 5.95)))
note(8.35, 6.75, 'Close to the BS → sends directly', ORANGE, ((8.7, 6.55), (8.6, 5.3)))
note(8.0, 2.15, 'One fused packet per cluster', NAVY, ((8.9, 2.35), (8.9, 3.95)))

# legend
lx, ly = 11.9, 7.75
ax.add_patch(FancyBboxPatch((lx - 0.2, ly - 1.35), 4.9, 1.65, boxstyle='round,pad=0.02,rounding_size=0.12', fc='white', ec='#d0cfc6', zorder=4))
sensor(lx + 0.2, ly, 'ch', 1.0); ax.text(lx + 0.55, ly, 'Cluster head (CH)', va='center', fontsize=10.5, zorder=9)
sensor(lx + 0.2, ly - 0.6, 'member', 0.9); ax.text(lx + 0.55, ly - 0.6, 'Member sensor', va='center', fontsize=10.5, zorder=9)
sensor(lx + 2.65, ly, 'backup', 0.9); ax.text(lx + 3.0, ly, 'Backup CH', va='center', fontsize=10.5, zorder=9)
sensor(lx + 2.65, ly - 0.6, 'low', 0.9); ax.text(lx + 3.0, ly - 0.6, 'Low energy', va='center', fontsize=10.5, zorder=9)
ax.plot([lx, lx + 0.45], [ly - 1.1, ly - 1.1], color='#8a8f96', ls='--', lw=1.3, zorder=9); ax.text(lx + 0.55, ly - 1.1, 'Cluster', va='center', fontsize=10.5, zorder=9)

# ── bottom strip: the five steps
steps = [('1  Elect CHs', 'one score: turn × energy\n× neighbours', CHC),
         ('2  Form clusters', 'join the nearest CH;\nkept for 5 rounds', GREEN),
         ('3  Collect & fuse', 'TDMA slots, then one\npacket per cluster', ORANGE),
         ('4  Protect the CH', 'handover · backup ·\nre-join', PURPLE),
         ('5  Deliver to BS', 'direct, or relay only\nif cheaper', BLUE)]
bw, gap, y0 = 2.95, 0.4, 0.28
x0 = (W - (5 * bw + 4 * gap)) / 2
for k, (t, d, c) in enumerate(steps):
    x = x0 + k * (bw + gap)
    ax.add_patch(FancyBboxPatch((x, y0), bw, 1.2, boxstyle='round,pad=0.02,rounding_size=0.14', fc='white', ec=c, lw=2, zorder=4))
    ax.add_patch(FancyBboxPatch((x, y0 + 0.82), bw, 0.38, boxstyle='round,pad=0.02,rounding_size=0.14', fc=c, ec=c, zorder=5))
    ax.text(x + bw / 2, y0 + 1.01, t, ha='center', va='center', color='white', fontsize=12.5, fontweight='bold', zorder=6)
    ax.text(x + bw / 2, y0 + 0.4, d, ha='center', va='center', color=INK, fontsize=10.5, zorder=6, linespacing=1.35)
    if k < 4:
        arrow((x + bw + 0.02, y0 + 0.6), (x + bw + gap - 0.02, y0 + 0.6), c=c, lw=2.4, ms=18)

fig.savefig(os.path.join(OUT, 'v8_concept.png'), dpi=160, facecolor='white')
print('saved', os.path.join(OUT, 'v8_concept.png'))
