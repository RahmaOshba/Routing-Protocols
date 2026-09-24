# Literature review as a comparison workbook.
# Our reproduction numbers come from ../../results/summary_all.csv; everything else is from the papers.
import csv, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
OUT = os.path.join(HERE, '..', 'Literature_Review_Comparison.xlsx')
RES = {r['run']: r for r in csv.DictReader(open(os.path.join(ROOT, 'results', 'summary_all.csv')))}

NAVY = '14213D'; TINT = 'F3F6FB'; HL = 'DCE9FA'
F = lambda **k: Font(name='Arial', **k)
thin = Side(style='thin', color='D9D8D2'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
INPUT = F(color='0000FF', size=10); CALC = F(size=10); TXT = F(size=10)
wb = Workbook()

def sheet(name, title, note=None):
    ws = wb.create_sheet(name); ws.sheet_view.showGridLines = False
    ws['A1'] = title; ws['A1'].font = F(bold=True, size=14, color=NAVY)
    if note: ws['A2'] = note; ws['A2'].font = F(italic=True, size=9, color='5F5E5A')
    return ws
def header(ws, r, cols, widths):
    for j, (c, w) in enumerate(zip(cols, widths), 1):
        x = ws.cell(r, j, c); x.font = F(bold=True, color='FFFFFF', size=10); x.fill = PatternFill('solid', fgColor=NAVY)
        x.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); x.border = BOX
        ws.column_dimensions[get_column_letter(j)].width = w
    ws.row_dimensions[r].height = 32
def put(ws, r, c, v, font=TXT, fmt=None, hl=False, center=False):
    x = ws.cell(r, c, v); x.font = font; x.border = BOX
    x.alignment = Alignment(wrap_text=True, vertical='top', horizontal='center' if center else 'left')
    if fmt: x.number_format = fmt
    x.fill = PatternFill('solid', fgColor=HL if hl else (TINT if r % 2 == 0 else 'FFFFFF'))
    return x

# ------------------------------------------------------------------ data
P = [  # id, short, year, authors, venue, category, link
 (1, 'LEACH', 2000, 'Heinzelman, Chandrakasan, Balakrishnan', 'Proc. HICSS-33 (IEEE)', 'Classic', 'https://doi.org/10.1109/HICSS.2000.926982'),
 (2, 'LEACH-C', 2002, 'Heinzelman, Chandrakasan, Balakrishnan', 'IEEE Trans. Wireless Communications', 'Classic', 'https://doi.org/10.1109/TWC.2002.804190'),
 (3, 'HEED', 2004, 'Younis, Fahmy', 'IEEE Trans. Mobile Computing 3(4)', 'Classic', 'https://doi.org/10.1109/TMC.2004.41'),
 (4, 'PEGASIS', 2002, 'Lindsey, Raghavendra', 'Proc. IEEE Aerospace Conference', 'Classic', 'https://doi.org/10.1109/AERO.2002.1035242'),
 (5, 'SH-LEACH', 2015, 'Shrestha, Kim, Jung, Lee', 'IJIBC 7(1):30–35', 'LEACH + HEED hybrid', 'https://doi.org/10.7236/IJIBC.2015.7.1.30'),
 (6, 'H-LEACH', 2016, 'Razaque, Mudigulam, Gavini, Amsaad, Abdulgader, Krishna', 'Proc. IEEE LISAT', 'LEACH + HEED hybrid', 'IEEE Xplore (search the title)'),
 (7, 'EECH-HEED', 2025, 'Kaur, Kour, Singh', 'Scientific Reports 15, 35548 (open access)', 'Recent hybrid', 'https://doi.org/10.1038/s41598-025-19480-y'),
 (8, 'RL-ILEACH', 2026, 'El-Sayed, Abd-Elgaber, Refaay', 'Scientific Reports (open access)', 'Recent — learning', 'https://doi.org/10.1038/s41598-026-65225-w'),
 (9, 'DL-HEED', 2025, 'Juwaied, Jackowska-Strumillo', 'Applied Sciences 15(16), 8996 (open access)', 'Recent — learning', 'https://doi.org/10.3390/app15168996'),
 (10, 'TLC', 2024, 'Subedi, Acharya, Lee, Lee', 'Telecom 5(3), 27 (open access)', 'Recent — LEACH extension', 'https://doi.org/10.3390/telecom5030027'),
 (11, 'FTEC', 2019, 'Jassbi, Moridi', 'Wireless Personal Communications', 'Fault tolerance', '—'),
 (12, 'CH-rotation review', 2022, 'Pachlor, Shrimankar, Nagwanshi, Paliwal', 'arXiv:2206.08892', 'Review', 'https://arxiv.org/abs/2206.08892'),
 (13, 'EEUC', 2005, 'Li, Ye, Chen, Wu', 'Proc. IEEE MASS', 'Unequal clustering', '—'),
 (14, 'Chauhan & Soni', 2021, 'Chauhan, Soni', 'J. Ambient Intell. Humanized Computing 12', 'Unequal clustering + relay', '—'),
]
# problem, method, strengths, limitations, relevance, code
TXTS = {
 'LEACH': ('Direct / MTE routing drains far or near nodes; static CHs die first.', 'Random CH rotation with threshold T(n) and epoch set G; nearest-CH join; TDMA; CH fuses data and sends to BS.', 'Fully distributed; rotation spreads load; local fusion.', 'Energy-blind election; random CH count and placement; direct CH→BS.', 'T(r), epoch G and nearest join kept in v3–v8-Chain.', 'leach_ORIGINAL / leach_EDITED'),
 'LEACH-C': ('LEACH gives no guarantee on CH number or placement.', 'BS chooses CHs centrally (simulated annealing) among nodes with ≥ average energy; defines the two-slope radio model.', 'High-quality clusters; standard radio model.', 'Needs positions and energy of all nodes at the BS every round.', 'Source of the unified radio model; "≥ average energy" idea behind I5.', '— (radio model only)'),
 'HEED': ('Energy-aware distributed clustering with bounded iterations.', 'CH_prob = max(C_prob·E_res/E_max, p_min), doubled each iteration; tentative/final CH; ties broken by cost (1/degree).', 'Energy-aware, distributed, provable termination, good CH spread.', 'Negotiation messages paid every clustering round.', 'Energy × connectivity score kept, negotiation removed (single pass, v3).', 'heed_ORIGINAL / heed_EDITED / heed_fairness_EDITED'),
 'PEGASIS': ('Reduce LEACH CH overhead further.', 'Greedy chain from the farthest node; data fused along the chain; leader i mod N sends to BS; chain rebuilt on death.', 'Short hops, one long transmission per round.', 'Large delay; single leader = single point of failure.', 'Motivates CH-to-CH relaying (v6/v7, energy-aware in v8-Chain).', 'pegasis_ORIGINAL / pegasis_EDITED'),
 'SH-LEACH': ('LEACH ignores energy; HEED probability shrinks at low energy.', 'LEACH draw with CH_prob = C·(E/E_max)·(C·r)/(1 + CH_cho mod 1/C).', 'Simple energy-aware LEACH.', 'r never reset → ≈ 29 CHs per round; BS position and packet size not stated.', 'Fixed (r mod 1/C) → best reproduced protocol.', 'shleach_ORIGINAL / _EDITED / _IMPROVED'),
 'H-LEACH': ('LEACH may elect weak nodes (energy holes).', 'e0 = P·E/E_max in LEACH threshold; CH only if E > E_avg.', 'Energy gate removes weak candidates.', 'Deadlock with equal starting energy; constant energy per round; no G set; 4312 > 4000-round limit.', 'Gate with ≥ + epoch fix = I5 in v8.', 'hleach_ORIGINAL / _EDITED / _IMPROVED'),
 'EECH-HEED': ('Soil monitoring with heterogeneous energy; static thresholds.', 'Zone 1 HEED (C_prob·E/E_avg), zone 2 EECH ((E/E_max)(D/D_max)), T·α·β threshold, multi-hop, adaptive hard/soft sensing.', 'Zone-aware election, multi-hop for far nodes.', 'Zone-2 P ≈ 1 → rotation collapses; lifetime partly from sending less; text/table inconsistencies.', 'Closest recent hybrid; its energy × degree score is close to v8-Chain\'s.', 'eechheed_ORIGINAL / _EDITED / _IMPROVED'),
 'RL-ILEACH': ('Static CH choice in LEACH/ILEACH.', 'Tabular Q-learning chooses CHs from residual energy, node density and distance.', 'Adaptive; lighter than deep RL.', 'FND earlier than ILEACH (524 vs 936); learning overhead not quantified; gain figures differ between abstract and contributions.', 'Learning-based trend; v8-Chain reaches a later FND with a closed-form score.', '— (reviewed)'),
 'DL-HEED': ('HEED heuristics miss spatial/temporal patterns.', 'Graph neural network on energy, degree, position and signal strength selects CHs (heterogeneous WSNs).', 'Uses graph structure; heterogeneous energy.', 'Training data and inference cost; compared mainly with HEED variants.', 'Confirms energy + degree as key features.', '— (reviewed)'),
 'TLC': ('LEACH boundary problem in random deployments.', 'Two-level LEACH-based CH selection with a distance threshold.', 'Simple, distributed.', 'Tied to deployment geometry; no CH failure recovery.', 'Targets CH placement, not CH protection.', '— (reviewed)'),
 'FTEC': ('CH failures break clusters.', 'Fault-tolerant energy-efficient clustering with backup mechanisms.', 'Keeps clusters working after a CH fails.', 'No energy-aware inter-CH relay.', 'Inspired backup CH and cluster repair (v5).', '— (cited)'),
 'CH-rotation review': ('Survey of CH-rotation strategies.', 'Classifies time-driven vs energy-driven rotation and their overhead.', 'Broad overview.', 'Review only.', 'Supports cluster reuse + energy-triggered handover (I2).', '— (cited)'),
 'EEUC': ('CHs near the BS die first (hot spot).', 'Unequal cluster sizes: smaller clusters near the BS.', 'Balances relay load.', 'Needs competition radius tuning.', 'Relay-energy awareness in v8-Chain.', '— (cited)'),
 'Chauhan & Soni': ('Relay load in multi-hop clustering.', 'Unequal clustering with multi-hop through low-degree relay nodes.', 'Energy-aware relaying.', 'Extra route computation.', 'Relay only through CHs that can afford it.', '— (cited)'),
}
# features: energy-aware election, distributed, single-pass election, cluster reuse, backup/fault tolerance, inter-CH multi-hop, energy-aware relay decision, handles heterogeneous energy, adaptive sensing, learning-based
FEAT = ['Energy-aware election', 'Distributed', 'Single-pass (no negotiation)', 'Cluster reuse (multi-round)', 'CH fault tolerance / backup', 'Inter-CH multi-hop', 'Relay only if it saves energy', 'Heterogeneous energy', 'Adaptive sensing', 'Learning-based']
FM = {
 'LEACH':            ['No', 'Yes', 'Yes', 'Partly', 'No', 'No', 'No', 'No', 'No', 'No'],
 'LEACH-C':          ['Yes', 'No', 'No', 'Partly', 'No', 'No', 'No', 'No', 'No', 'No'],
 'HEED':             ['Yes', 'Yes', 'No', 'No', 'No', 'Partly', 'No', 'No', 'No', 'No'],
 'PEGASIS':          ['No', 'Partly', 'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'No'],
 'SH-LEACH':         ['Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No'],
 'H-LEACH':          ['Yes', 'Partly', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No'],
 'EECH-HEED':        ['Yes', 'Yes', 'Yes', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No'],
 'RL-ILEACH':        ['Yes', 'Partly', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes'],
 'DL-HEED':          ['Yes', 'Partly', 'No', 'No', 'No', 'Partly', 'No', 'Yes', 'No', 'Yes'],
 'TLC':              ['Partly', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No'],
 'FTEC':             ['Yes', 'Yes', 'Partly', 'No', 'Yes', 'Partly', 'No', 'No', 'No', 'No'],
 'EEUC':             ['Yes', 'Yes', 'Partly', 'No', 'No', 'Yes', 'Partly', 'No', 'No', 'No'],
 'Chauhan & Soni':   ['Yes', 'Yes', 'Partly', 'No', 'No', 'Yes', 'Yes', 'No', 'No', 'No'],
 'v8-Chain (proposed)': ['Yes', 'Partly', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No'],
}
# simulation parameters as used in each paper (our ORIGINAL codes follow these)
PAR = [
 ('LEACH', 'not re-verified', '100', '50 × 50 m', '(25, −100) — far', '0.5 J (also 0.25 / 1 J)', '2000', 'single-term, 100 pJ/bit/m²', '5 nJ/bit', 'P = 0.05'),
 ('LEACH-C', 'ns', '100', '100 × 100 m', '(50, 175) — far', '—', '—', 'two-slope (defines ε_fs, ε_mp)', '5 nJ/bit', 'k = 5 clusters'),
 ('HEED', 'not re-verified', '300–700 (500 used)', '100 × 100 m', '(50, 175) — far', '2 J', '1000 (100 B + 25 B header)', 'two-slope, d0 = 75 m', '5 nJ/bit', 'C_prob = 0.05, p_min = 5·10⁻⁴, 5 TDMA frames/round'),
 ('PEGASIS', 'not re-verified', '100', '50 × 50 m (also 100 × 100 m)', '(25, 150) — far', '0.5 J', '2000', 'single-term, 100 pJ/bit/m²', '5 nJ/bit', 'leader = i mod N'),
 ('SH-LEACH', 'MATLAB', '100', '100 × 100 m', 'not stated (centre assumed)', '0.5 J', 'not stated (2000 assumed)', 'single-term, 100 pJ/bit/m²', 'not stated (5 nJ assumed)', 'C_prob = 0.10, 2000 rounds'),
 ('H-LEACH', 'MATLAB', '100', '100 × 100 m', '(50, 50) — centre', '0.5 J', '4000', 'two-slope (tables conflict with 100 pJ)', '5 nJ/bit', 'P = 0.1, max 4000 rounds'),
 ('EECH-HEED', 'MATLAB R2023a', '100 (30 + 70)', '100 × 100 m', '(50, 50) — centre', 'zone 1: 0.5 J; zone 2: 0.3–0.6 J, 20 % at 1.0–1.5 J', '4000', 'two-slope', '50 nJ/bit', 'C_prob = 0.05, zone radius 30 m, 20 runs'),
 ('RL-ILEACH', 'MATLAB', '200 and 500', 'not re-verified', 'not re-verified', 'not re-verified', 'not re-verified', 'first-order', 'not re-verified', 'tabular Q-learning'),
 ('DL-HEED', 'not re-verified', 'several sizes', 'not re-verified', 'not re-verified', 'heterogeneous', 'not re-verified', 'first-order', 'not re-verified', 'graph neural network'),
 ('TLC', 'not re-verified', 'random deployment', 'not re-verified', 'not re-verified', 'not re-verified', 'not re-verified', 'first-order', 'not re-verified', 'distance threshold (level 1)'),
 ('Unified env. (this thesis)', 'ns-3.41 (C++)', '100', '100 × 100 m', '(50, 50); far case (50, −100)', '0.5 J', '2000 (control 200)', 'two-slope, d0 ≈ 87.7 m', '5 nJ/bit', 'setup every 5 rounds, run to LND'),
]
# published results and our reproduction (paper settings) / unified improved
PUB = [
 ('LEACH', 932, None, 1312, None, 'Table 2 (0.5 J)', 'leach_ORIGINAL', 'leach_EDITED'),
 ('HEED', None, None, None, None, 'graphs only', 'heed_ORIGINAL', 'heed_EDITED'),
 ('PEGASIS', 1578, 2082, 2192, None, 'Table 1, 50 × 50 m', 'pegasis_ORIGINAL', 'pegasis_EDITED'),
 ('SH-LEACH', None, None, None, None, 'graphs only', 'shleach_ORIGINAL', 'shleach_IMPROVED'),
 ('H-LEACH', None, None, 4312, None, 'Fig. 2 (≈ 4312); LEACH 1778', 'hleach_ORIGINAL', 'hleach_IMPROVED'),
 ('EECH-HEED', 1250, 1650, 2200, 0.95, 'Table 7', 'eechheed_ORIGINAL', 'eechheed_IMPROVED'),
 ('RL-ILEACH', 524, None, None, None, 'Table 3 (200 nodes): FND 524; ILEACH 936, LEACH 156', None, None),
 ('DL-HEED', None, None, None, None, 'up to +60 % lifetime vs HEED', None, None),
 ('TLC', None, None, None, None, 'longer lifetime than LEACH variants', None, None),
]
EQ = [
 ('LEACH', 'T(n) = P / (1 − P·(r mod 1/P)) if n ∈ G, else 0', 'Random CH draw with rotation'),
 ('LEACH-C / radio', 'E_tx = k·E_elec + k·ε_fs·d² (d < d0) ; k·E_elec + k·ε_mp·d⁴ (d ≥ d0) ; E_rx = k·E_elec', 'First-order two-slope radio model'),
 ('HEED', 'CH_prob = max(C_prob·E_res/E_max, p_min), doubled every iteration', 'Iterative energy-based election'),
 ('PEGASIS', 'leader(round i) = node (i mod N)', 'Rotating chain leader'),
 ('SH-LEACH', 'CH_prob = C·(E/E_max)·(C·r) / (1 + CH_cho mod 1/C)', 'Eq. 3 — r never reset (flaw)'),
 ('H-LEACH', 'e0 = P·E/E_max ; t(n) = e0/(1 − e0·(r mod round(1/e0))) ; CH if rand < t(n) and E > E_avg', 'Algorithm 1 — deadlock with equal energy'),
 ('EECH-HEED', 'Zone 1: P = C·E/E_avg ; Zone 2: P = (E/E_max)(D/D_max) ; T = P/(1 − P(r mod 1/P))·α·β', 'Eq. 4–6, α = E/E0, β = 1 − d/d_max'),
 ('EECH-HEED', 'HT = HT0 + λ·dS/dt ; ST = ST0 + μ(1 − E/E0)', 'Eq. 7 — adaptive sensing'),
 ('v8-Chain (proposed)', 'P_CH = T(r)·(E/E0)·(1 + deg/deg_max) for E ≥ E_avg ; relay if E_tx(c→j) + E_rx + E_DA < E_tx(c→BS)', 'Single-pass score + energy gate + energy-aware relay'),
]
REFS = [
 'W. R. Heinzelman, A. Chandrakasan, H. Balakrishnan, "Energy-Efficient Communication Protocol for Wireless Microsensor Networks," Proc. HICSS-33, 2000.',
 'W. B. Heinzelman, A. P. Chandrakasan, H. Balakrishnan, "An Application-Specific Protocol Architecture for Wireless Microsensor Networks," IEEE Trans. Wireless Communications, 2002.',
 'O. Younis, S. Fahmy, "HEED: A Hybrid, Energy-Efficient, Distributed Clustering Approach for Ad Hoc Sensor Networks," IEEE Trans. Mobile Computing, 3(4), 2004.',
 'S. Lindsey, C. S. Raghavendra, "PEGASIS: Power-Efficient Gathering in Sensor Information Systems," Proc. IEEE Aerospace Conference, 2002.',
 'S. Shrestha, Y. M. Kim, K. Jung, J.-Y. Lee, "The Improved Energy Efficient LEACH Protocol Technology of Wireless Sensor Networks," IJIBC 7(1):30–35, 2015.',
 'A. Razaque et al., "H-LEACH: Hybrid-Low Energy Adaptive Clustering Hierarchy for Wireless Sensor Networks," Proc. IEEE LISAT, 2016.',
 'S. Kaur, S. Kour, M. Singh, "EECH-HEED: an adaptive hybrid clustering protocol for energy efficient soil monitoring in heterogeneous WSNs," Scientific Reports 15, 35548, 2025.',
 'H. H. El-Sayed, E. M. Abd-Elgaber, S. K. Refaay, "An intelligent reinforcement learning enhanced improved LEACH protocol for prolonging WSN lifetime," Scientific Reports, 2026.',
 'A. Juwaied, L. Jackowska-Strumillo, "DL-HEED: A Deep Learning Approach to Energy-Efficient Clustering in Heterogeneous WSNs," Applied Sciences 15(16), 8996, 2025.',
 'S. Subedi, S. K. Acharya, J. Lee, S. Lee, "Two-Level Clustering Algorithm for Cluster Head Selection in Randomly Deployed WSNs," Telecom 5(3), 27, 2024.',
 'J. Jassbi, S. Moridi, "Fault Tolerance and Energy Efficient Clustering Algorithm in Wireless Sensor Networks: FTEC," Wireless Personal Communications, 2019.',
 'R. Pachlor, D. Shrimankar, K. K. Nagwanshi, M. Paliwal, "Cluster-Head Rotation Approaches in Sensor Networks: A Review," arXiv:2206.08892, 2022.',
 'C. Li, M. Ye, G. Chen, J. Wu, "An Energy-Efficient Unequal Clustering Mechanism for Wireless Sensor Networks," Proc. IEEE MASS, 2005.',
 'V. Chauhan, S. Soni, "Energy Aware Unequal Clustering Algorithm with Multi-hop Routing via Low Degree Relay Nodes for WSNs," J. Ambient Intelligence and Humanized Computing 12, 2021.',
]

# ------------------------------------------------------------------ README
ws = wb.active; ws.title = 'README'; ws.sheet_view.showGridLines = False
for i, (t, f) in enumerate([
    ('Literature review — comparison workbook', F(bold=True, size=14, color=NAVY)),
    ('Companion to Literature_Review.docx. One row per paper, with v8-Chain added for comparison.', TXT), ('', None),
    ('Overview — problem, method, strengths, limitations and relevance of each paper', TXT),
    ('Feature matrix — which paper has which design feature (Yes / Partly / No), with counts', TXT),
    ('Parameters — simulation settings reported in each paper vs. the unified environment', TXT),
    ('Results — published numbers vs. our reproduction (paper settings) and the unified / improved runs', TXT),
    ('Equations — the key formula of each protocol', TXT), ('References — full citations', TXT), ('', None),
    ('Blue numbers = typed from the papers; black = formulas; our results come from results/summary_all.csv.', F(italic=True, size=10)),
    ('"not re-verified" = the value was not checked against the paper text for this workbook.', F(italic=True, size=10))], 1):
    ws.cell(i, 1, t)
    if f: ws.cell(i, 1).font = f
ws.column_dimensions['A'].width = 110

# ------------------------------------------------------------------ Overview
ws = sheet('Overview', 'Overview of the reviewed papers')
cols = ['#', 'Protocol', 'Year', 'Authors', 'Venue', 'Category', 'Problem addressed', 'Method', 'Strengths', 'Limitations', 'Relevance to v8-Chain', 'Code in this thesis', 'Link']
header(ws, 4, cols, [4, 16, 7, 26, 26, 18, 34, 46, 30, 42, 34, 26, 30])
for i, (n, s, y, a, v, cat, link) in enumerate(P):
    r = 5 + i; t = TXTS[s]
    for j, val in enumerate([n, s, y, a, v, cat, t[0], t[1], t[2], t[3], t[4], t[5], link], 1):
        put(ws, r, j, val, F(bold=(j == 2), size=10), center=j in (1, 3))
r = 5 + len(P)
v8 = ['—', 'v8-Chain (proposed)', 2026, 'R. K. Oshba (this thesis)', 'Master\'s thesis', 'Proposed',
      'Early first-node death; no protocol combines cheap election, reuse, CH protection and energy-aware relay.',
      'Single-pass score T(r)·(E/E0)·(1 + deg/deg_max) with energy gate; 5-round cluster reuse; backup CH, proactive handover, orphan re-join; direct-to-BS; relay through a closer CH only if cheaper.',
      'Latest FND of all compared protocols; robust over 8 topologies; +16 % FND with a far BS.', 'Analytical energy model; static homogeneous nodes; PEGASIS keeps a longer LND; security layer not simulated yet.',
      '—', 'code/4_PROPOSED/v8_chain_*.cc', 'github.com/RahmaOshba/WSNs']
for j, val in enumerate(v8, 1): put(ws, r, j, val, F(bold=(j == 2), size=10), hl=True, center=j in (1, 3))
ws.freeze_panes = 'C5'

# ------------------------------------------------------------------ Feature matrix
ws = sheet('Feature matrix', 'Design features of each protocol', 'Yes = fully present, Partly = partially or optionally, No = absent. The last row counts how many reviewed papers (not v8-Chain) have each feature.')
header(ws, 4, ['Protocol'] + FEAT + ['Yes count'], [20] + [14] * len(FEAT) + [10])
names = list(FM.keys())
for i, n in enumerate(names):
    r = 5 + i; hl = n.startswith('v8')
    put(ws, r, 1, n, F(bold=True, size=10), hl=hl)
    for j, v in enumerate(FM[n], 2): put(ws, r, j, v, TXT, hl=hl, center=True)
    lc = get_column_letter(1 + len(FEAT))
    put(ws, r, 2 + len(FEAT), f'=COUNTIF(B{r}:{lc}{r},"Yes")', CALC, hl=hl, center=True)
last_paper = 5 + len(names) - 2; cr = 5 + len(names)
put(ws, cr, 1, 'Papers with "Yes"', F(bold=True, size=10))
for j in range(2, 2 + len(FEAT)):
    cl = get_column_letter(j); put(ws, cr, j, f'=COUNTIF({cl}5:{cl}{last_paper},"Yes")', F(bold=True, size=10), center=True)
rng = f'B5:{get_column_letter(1 + len(FEAT))}{5 + len(names) - 1}'
ws.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"Yes"'], fill=PatternFill('solid', fgColor='D7F2E6'), font=Font(name='Arial', color='0B6E4F', bold=True)))
ws.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"Partly"'], fill=PatternFill('solid', fgColor='FFF1D6'), font=Font(name='Arial', color='8A5A00')))
ws.conditional_formatting.add(rng, CellIsRule(operator='equal', formula=['"No"'], fill=PatternFill('solid', fgColor='FDECEC'), font=Font(name='Arial', color='A12B2B')))
ws.row_dimensions[4].height = 45
ws.cell(cr + 2, 1, 'Reading: no reviewed paper has both cluster reuse + CH fault tolerance + an energy-aware relay decision; v8-Chain combines them.').font = F(italic=True, size=10)

# ------------------------------------------------------------------ Parameters
ws = sheet('Parameters', 'Simulation settings reported in each paper', 'The ORIGINAL codes in code/1_ORIGINAL follow these settings. "assumed" = missing in the paper and chosen by us (documented in the code).')
header(ws, 4, ['Protocol', 'Simulator', 'Nodes', 'Field', 'Base station', 'Initial energy', 'Data packet (bits)', 'Radio model', 'Aggregation', 'Other key parameters'], [22, 16, 16, 20, 24, 30, 22, 30, 18, 38])
for i, row in enumerate(PAR):
    r = 5 + i; hl = row[0].startswith('Unified')
    for j, v in enumerate(row, 1): put(ws, r, j, v, F(bold=(j == 1), size=10), hl=hl)

# ------------------------------------------------------------------ Results
ws = sheet('Results', 'Published results vs. our reproduction', 'Blue = published (paper). "Ours (paper settings)" = code/1_ORIGINAL. "Ours (unified)" = best version in the unified environment (EDITED or IMPROVED). LND diff = |ours − published| ÷ published.')
header(ws, 4, ['Protocol', 'Pub. FND', 'Pub. HND', 'Pub. LND', 'Pub. PDR', 'Published source', 'Ours FND (paper settings)', 'Ours HND', 'Ours LND', 'Ours PDR', 'FND diff.', 'LND diff.', 'Unified run', 'Unified FND', 'Unified LND', 'Unified PDR', 'v8-Chain FND gain'],
       [14, 9, 9, 9, 9, 34, 12, 9, 9, 9, 9, 9, 18, 10, 10, 10, 13])
v8r = RES['v8_chain_center']
for i, (n, pf, ph, pl, pp, src, orig, uni) in enumerate(PUB):
    r = 5 + i
    put(ws, r, 1, n, F(bold=True, size=10))
    for j, v in enumerate([pf, ph, pl], 2): put(ws, r, j, v if v is not None else 'n/a', INPUT, '#,##0', center=True)
    put(ws, r, 5, pp if pp is not None else 'n/a', INPUT, '0%', center=True); put(ws, r, 6, src)
    if orig:
        o = RES[orig]
        for j, k in enumerate(['FND', 'HND', 'LND'], 7): put(ws, r, j, int(o[k]), INPUT, '#,##0', center=True)
        put(ws, r, 10, float(o['PDR']), INPUT, '0.00%', center=True)
        put(ws, r, 11, f'=IF(ISNUMBER(B{r}),ABS(G{r}-B{r})/B{r},"")', CALC, '0.0%', center=True)
        put(ws, r, 12, f'=IF(ISNUMBER(D{r}),ABS(I{r}-D{r})/D{r},"")', CALC, '0.0%', center=True)
        u = RES[uni]
        put(ws, r, 13, uni); put(ws, r, 14, int(u['FND']), INPUT, '#,##0', center=True); put(ws, r, 15, int(u['LND']), INPUT, '#,##0', center=True)
        put(ws, r, 16, float(u['PDR']), INPUT, '0.00%', center=True)
        put(ws, r, 17, f'=$N${5 + len(PUB)}/N{r}-1', CALC, '+0%;-0%', center=True)
    else:
        for j in range(7, 18): put(ws, r, j, 'not re-implemented' if j == 13 else '', TXT, center=True)
r = 5 + len(PUB)
put(ws, r, 1, 'v8-Chain', F(bold=True, size=10), hl=True)
for j in range(2, 13): put(ws, r, j, '', hl=True)
put(ws, r, 13, 'v8_chain_center', hl=True); put(ws, r, 14, int(v8r['FND']), INPUT, '#,##0', True, True)
put(ws, r, 15, int(v8r['LND']), INPUT, '#,##0', True, True); put(ws, r, 16, float(v8r['PDR']), INPUT, '0.00%', True, True); put(ws, r, 17, '—', hl=True, center=True)
ws.cell(r + 2, 1, 'H-LEACH\'s 4312 comes from a constant energy per round (no radio model); EECH-HEED\'s paper settings include adaptive sensing and 56 J of energy.').font = F(italic=True, size=9)

# ------------------------------------------------------------------ Equations
ws = sheet('Equations', 'Key equation of each protocol')
header(ws, 4, ['Protocol', 'Equation', 'Meaning'], [20, 90, 42])
for i, (n, e, m) in enumerate(EQ):
    r = 5 + i; put(ws, r, 1, n, F(bold=True, size=10), hl=n.startswith('v8')); put(ws, r, 2, e, Font(name='Consolas', size=10), hl=n.startswith('v8')); put(ws, r, 3, m, hl=n.startswith('v8'))

# ------------------------------------------------------------------ References
ws = sheet('References', 'References')
header(ws, 4, ['#', 'Reference'], [5, 150])
for i, t in enumerate(REFS):
    put(ws, 5 + i, 1, i + 1, center=True); put(ws, 5 + i, 2, t)

wb.save(OUT); print('saved', OUT)
