# Step-by-step infographic of the proposed protocol (v8 / v8-Chain) -> fig/v8_steps.png
import os
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle, FancyArrowPatch, Rectangle, Polygon, Arc
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'fig')
INK, MUTED, NAVY = '#1f1f1d', '#5f5e5a', '#14213d'
CH, MEM, GREY = '#1e8a4c', '#2a78d6', '#a8a7a2'
STEPS = [('#14213d', '#eef2f9'), ('#1e8a4c', '#edf7f1'), ('#e07b24', '#fdf3e8'), ('#6d3fb2', '#f3eefb'),
         ('#c89b00', '#fdf8e6'), ('#2a78d6', '#eaf2fc'), ('#c0392b', '#fcecea')]

W, PH, GAP = 11.0, 2.35, 0.42
N = len(STEPS)
H = 1.25 + N * PH + (N - 1) * GAP + 0.3
fig = plt.figure(figsize=(W, H)); ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis('off')

def arrow(a, b, c=MUTED, lw=1.6, ls='-', ms=13, both=False):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle='<|-|>' if both else '-|>', mutation_scale=ms, color=c, lw=lw, linestyle=ls, shrinkA=3, shrinkB=3, zorder=4))
def node(x, y, r=0.1, c=MEM, z=5):
    ax.add_patch(Circle((x, y), r, color=c, zorder=z, ec='white', lw=1.2))
def chnode(x, y, r=0.2, c=CH, label='CH', fs=8.5):
    ax.add_patch(Circle((x, y), r, color=c, zorder=6, ec='white', lw=1.5)); ax.text(x, y, label, ha='center', va='center', color='white', fontsize=fs, fontweight='bold', zorder=7)
def tower(x, y, s=1.0, c=NAVY):
    ax.add_patch(Polygon([[x - 0.16 * s, y - 0.32 * s], [x + 0.16 * s, y - 0.32 * s], [x, y + 0.2 * s]], closed=True, fill=False, ec=c, lw=2, zorder=6))
    ax.plot([x, x], [y - 0.32 * s, y + 0.2 * s], color=c, lw=1.5, zorder=6)
    ax.add_patch(Circle((x, y + 0.24 * s), 0.045 * s, color=c, zorder=6))
    for rr in (0.12, 0.2):
        ax.add_patch(Arc((x, y + 0.24 * s), 2 * rr * s, 2 * rr * s, theta1=30, theta2=150, color=c, lw=1.3, zorder=6))
def battery(x, y, frac, w=0.36, h=0.16):
    ax.add_patch(Rectangle((x, y), w, h, fill=False, ec=INK, lw=1.1, zorder=7)); ax.add_patch(Rectangle((x + w, y + h * 0.3), 0.04, h * 0.4, color=INK, zorder=7))
    ax.add_patch(Rectangle((x + 0.02, y + 0.02), (w - 0.04) * frac, h - 0.04, color='#1baf7a' if frac > 0.4 else '#e34948', zorder=7))
def panel(i, title, body):
    col, fill = STEPS[i]
    y0 = H - 1.25 - (i + 1) * PH - i * GAP
    ax.add_patch(FancyBboxPatch((0.25, y0), W - 0.5, PH, boxstyle='round,pad=0.02,rounding_size=0.18', fc=fill, ec=col, lw=1.6, zorder=1))
    ax.add_patch(Circle((0.8, y0 + PH - 0.45), 0.28, color=col, zorder=3)); ax.text(0.8, y0 + PH - 0.45, str(i + 1), ha='center', va='center', color='white', fontsize=15, fontweight='bold', zorder=4)
    ax.text(1.25, y0 + PH - 0.45, title, ha='left', va='center', color=col, fontsize=16.5, fontweight='bold', zorder=4)
    ax.text(0.55, y0 + PH - 0.95, body, ha='left', va='top', color=INK, fontsize=10.6, zorder=4, linespacing=1.45)
    if i < N - 1:
        ax.add_patch(FancyArrowPatch((W / 2, y0 - 0.04), (W / 2, y0 - GAP + 0.04), arrowstyle='simple,head_width=0.9,head_length=0.7,tail_width=0.35', mutation_scale=18, color=NAVY, zorder=3))
    return y0

ax.text(W / 2, H - 0.45, 'Proposed protocol: v8  (+ v8-Chain for a far base station)', ha='center', va='center', fontsize=19, fontweight='bold', color=NAVY)
ax.text(W / 2, H - 0.88, 'LEACH rotation  +  HEED energy & neighbours in one step  +  cluster reuse  +  CH protection  +  smart relay', ha='center', va='center', fontsize=11, color=MUTED, style='italic')
X0 = 5.3    # left edge of the drawings

# 1 ── single-pass election
y = panel(0, 'Single-Pass CH Election', 'Every node computes ONE score\n— no negotiation messages:\nscore = T(r) × E/E0 × (1 + deg/deg_max)\nLEACH G-set keeps the rotation fair.\nEnergy gate: only E ≥ average may lead.')
base = y + 0.35
vals = [(0.45, 'A'), (0.95, 'B'), (0.3, 'C'), (0.7, 'D'), (0.55, 'E')]
for k, (v, lab) in enumerate(vals):
    x = X0 + 0.35 + k * 0.72
    win = v == max(vv for vv, _ in vals)
    ax.add_patch(Rectangle((x - 0.17, base + 0.28), 0.34, v * 1.05, color=CH if win else '#b8cde6', zorder=5))
    (chnode(x, base, 0.17, fs=7) if win else node(x, base, 0.13))
    ax.text(x, base + 0.34 + v * 1.05, lab, ha='center', fontsize=8.5, color=INK, zorder=6)
ax.text(X0 + 0.35 + 1 * 0.72, base + 1.62, '★ highest score', ha='center', fontsize=9, color=CH, fontweight='bold')
xg = X0 + 3.85
node(xg, base + 0.55, 0.14, GREY); ax.plot([xg - 0.18, xg + 0.18], [base + 0.37, base + 0.73], color='#e34948', lw=2, zorder=7)
ax.text(xg, base + 0.12, 'already served\n(G-set)', ha='center', va='top', fontsize=8, color=MUTED)
node(xg + 0.9, base + 0.55, 0.14, MEM); battery(xg + 0.72, base + 0.8, 0.25)
ax.text(xg + 0.9, base + 0.12, 'E < average\n(energy gate)', ha='center', va='top', fontsize=8, color=MUTED)

# 2 ── clusters + reuse
y = panel(1, 'Clustering & Cluster Reuse', 'Members join the nearest CH (strongest\nsignal); the CH sends a TDMA schedule.\nClusters are KEPT for 5 rounds:\nset-up cost paid once per 5 rounds.')
rng = np.random.default_rng(3)
for cx in (X0 + 0.55, X0 + 1.85):
    cy = y + 1.2
    ax.add_patch(Circle((cx, cy), 0.55, fill=False, ls='--', ec=MUTED, lw=1.1, zorder=4))
    for a in np.linspace(0, 2 * np.pi, 6, endpoint=False) + rng.uniform(0, 0.5):
        px, py = cx + 0.38 * np.cos(a), cy + 0.38 * np.sin(a); node(px, py, 0.075); ax.plot([px, cx], [py, cy], color=MEM, lw=0.9, zorder=4)
    chnode(cx, cy, 0.17, fs=7)
tx = X0 + 2.7; ty = y + 1.05
for k in range(11):
    setup = k % 5 == 0
    ax.add_patch(Rectangle((tx + k * 0.2, ty), 0.17, 0.42, color=CH if setup else '#cfe3d7', zorder=5))
ax.text(tx + 1.1, ty + 0.6, 'rounds →', ha='center', fontsize=8.5, color=MUTED)
ax.text(tx, ty - 0.12, 'set-up', ha='left', va='top', fontsize=8.5, color=CH, fontweight='bold')
ax.text(tx + 1.0, ty - 0.12, 'set-up', ha='left', va='top', fontsize=8.5, color=CH, fontweight='bold')
ax.text(tx + 0.3, ty - 0.42, 'data only (4 rounds)', ha='left', va='top', fontsize=8.5, color=MUTED)

# 3 ── TDMA + direct-to-BS
y = panel(2, 'TDMA Slots & Direct-to-BS', 'Each member sends in its own slot\n(no collisions) and sleeps otherwise.\nA member that is not farther from the BS\nthan from its CH sends straight to the BS.')
cy = y + 1.15
for k in range(5):
    act = k in (0, 2)
    ax.add_patch(FancyBboxPatch((X0 + 0.1 + k * 0.62, cy + 0.2), 0.55, 0.38, boxstyle='round,pad=0.01,rounding_size=0.05', color='#f6c89a' if act else '#e4e3de', zorder=5))
    ax.text(X0 + 0.375 + k * 0.62, cy + 0.39, f'slot {k + 1}' if k < 4 else '…', ha='center', va='center', fontsize=8, zorder=6)
    ax.text(X0 + 0.375 + k * 0.62, cy + 0.02, 'send' if act else 'sleep', ha='center', va='center', fontsize=8, color='#e07b24' if act else MUTED, zorder=6)
bx, byy = X0 + 4.6, y + 1.2
tower(bx, byy, 1.1)
chx = X0 + 3.3; chnode(chx, y + 0.75, 0.17, fs=7)
m = (X0 + 3.95, y + 1.05); node(*m, 0.1)
arrow(m, (bx - 0.12, byy - 0.12), c='#e07b24', lw=1.8)
ax.plot([m[0], chx], [m[1], y + 0.75], color=GREY, lw=1, ls=':', zorder=4)
ax.text(X0 + 4.2, y + 0.3, 'BS closer than CH → send directly', ha='center', va='center', fontsize=8.5, color='#e07b24', fontweight='bold')

# 4 ── fault tolerance
y = panel(3, 'CH Protection (Fault Tolerance)', 'Handover: a CH that cannot finish the\nround passes the role before it dies.\nBackup: the strongest member replaces a\ndead CH. Re-join: orphans join the\nnearest alive CH.  No round without CHs.')
cy = y + 1.1
chnode(X0 + 0.6, cy, 0.22, c='#9a9a96'); battery(X0 + 0.42, cy + 0.32, 0.12)
ax.text(X0 + 0.6, cy - 0.42, 'weak CH', ha='center', fontsize=8.5, color=MUTED)
chnode(X0 + 2.2, cy, 0.22); battery(X0 + 2.02, cy + 0.32, 0.85)
ax.text(X0 + 2.2, cy - 0.42, 'backup / new CH', ha='center', fontsize=8.5, color=CH, fontweight='bold')
arrow((X0 + 0.85, cy), (X0 + 1.95, cy), c='#6d3fb2', lw=2); ax.text(X0 + 1.4, cy + 0.14, 'handover', ha='center', fontsize=8.5, color='#6d3fb2', fontweight='bold')
chnode(X0 + 4.3, cy + 0.15, 0.2)
for px, py in [(X0 + 3.3, cy + 0.55), (X0 + 3.2, cy - 0.2), (X0 + 3.55, cy - 0.5)]:
    node(px, py, 0.09); arrow((px, py), (X0 + 4.1, cy + 0.12), c='#6d3fb2', lw=1.1, ls='--', ms=9)
ax.text(X0 + 3.45, cy - 0.78, 'orphans re-join', ha='center', fontsize=8.5, color='#6d3fb2')

# 5 ── aggregation
y = panel(4, 'Data Aggregation at the CH', 'The CH fuses its members\' readings and\nits own into ONE packet: many short\nhops, only one long transmission.')
cx, cy = X0 + 1.6, y + 1.05
for a in np.linspace(0, 2 * np.pi, 7, endpoint=False) + np.pi / 7:
    px, py = cx + 0.72 * np.cos(a), cy + 0.5 * np.sin(a); node(px, py, 0.08); arrow((px, py), (cx, cy), c=MEM, lw=0.9, ms=8, ls='--')
chnode(cx, cy, 0.22)
arrow((cx + 0.28, cy), (cx + 1.55, cy), c='#c89b00', lw=2)
ax.add_patch(FancyBboxPatch((cx + 1.62, cy - 0.23), 0.9, 0.46, boxstyle='round,pad=0.02,rounding_size=0.08', color='#f2c200', zorder=5))
ax.text(cx + 2.07, cy, '1 packet', ha='center', va='center', fontsize=9, fontweight='bold', zorder=6)
ax.text(cx + 2.07, cy - 0.45, '8 readings → 1', ha='center', fontsize=8.5, color=MUTED)

# 6 ── CH → BS / smart relay
y = panel(5, 'CH → BS  (v8-Chain: Smart Relay)', 'BS near (centre): every CH sends directly.\nBS far: a CH hands its packet to a CH\nnearer the BS ONLY if that costs less:\nE_tx(c→j) + E_rx(j) + E_DA(j) < E_tx(c→BS)')
cy = y + 1.0
xs = [X0 + 0.3, X0 + 1.4, X0 + 2.5]
for k, x in enumerate(xs):
    chnode(x, cy + (0.25 if k == 1 else 0), 0.2)
for k in range(len(xs) - 1):
    arrow((xs[k] + 0.22, cy + (0.25 if k == 1 else 0)), (xs[k + 1] - 0.22, cy + (0.25 if k + 1 == 1 else 0)), c='#2a78d6', lw=1.8)
tower(X0 + 4.5, cy + 0.1, 1.15)
arrow((xs[-1] + 0.24, cy), (X0 + 4.25, cy), c='#2a78d6', lw=2)
ax.text(X0 + 1.4, cy - 0.55, 'relay only when cheaper', ha='center', fontsize=9, color='#2a78d6', fontweight='bold')
ax.text(X0 + 4.5, cy - 0.55, 'far BS', ha='center', fontsize=9, color=NAVY)

# 7 ── sink
y = panel(6, 'Sink / Base Station', 'Receives the fused data, and once per\nset-up broadcasts the network\'s average\nenergy (used by the energy gate).')
cy = y + 1.05
tower(X0 + 1.2, cy + 0.1, 1.3)
for k in range(3):
    chnode(X0 + 3.2 + k * 0.7, cy - 0.35 + (k % 2) * 0.3, 0.17, fs=7)
    arrow((X0 + 3.0 + k * 0.7, cy - 0.3 + (k % 2) * 0.3), (X0 + 1.5, cy), c='#c0392b', lw=1.3, ms=10)
ax.text(X0 + 1.2, cy - 0.6, 'mains-powered sink', ha='center', fontsize=8.5, color=MUTED)
arrow((X0 + 1.55, cy + 0.35), (X0 + 3.2, cy + 0.35), c='#c0392b', lw=1.3, ls='--', ms=10)
ax.text(X0 + 3.9, cy + 0.55, 'avg-energy beacon every set-up', ha='center', fontsize=8.5, color='#c0392b', fontweight='bold')

fig.savefig(os.path.join(OUT, 'v8_steps.png'), dpi=170, facecolor='white')
print('saved', os.path.join(OUT, 'v8_steps.png'))
