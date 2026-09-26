# Results comparison as ONE simple Excel sheet. Numbers come from ../../results/summary_all.csv
import csv, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, Reference
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
OUT = os.path.join(HERE, '..', 'Results_Comparison.xlsx')
S = {r['run']: r for r in csv.DictReader(open(os.path.join(ROOT, 'results', 'summary_all.csv')))}
FND = lambda r: int(S[r]['FND'])
def rec(r): x = S[r]; return int(x['FND']), int(x['HND']), int(x['LND']), float(x['PDR'])

NAVY, TINT, HL, GROUP = '14213D', 'F3F6FB', 'DCE9FA', 'E8EEF7'
font = lambda **k: Font(name='Arial', **k)
thin = Side(style='thin', color='D0CFC6'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook(); ws = wb.active; ws.title = 'Results'; ws.sheet_view.showGridLines = False
for j, w in enumerate([22, 26, 11, 11, 11, 11, 13, 14], 1): ws.column_dimensions[get_column_letter(j)].width = w
ws['A1'] = 'Results — all protocols in the same environment'; ws['A1'].font = font(bold=True, size=15, color=NAVY)
ws['A2'] = ('ns-3.41, 100 nodes, 100 × 100 m, 0.5 J per node, BS at the centre (50, 50); far BS = (50, −100). '
            'FND / HND / LND = round of the first / half / last node death. PDR = delivered ÷ generated readings.')
ws['A2'].font = font(italic=True, size=10, color='5F5E5A')
r = 3

def title(t):
    global r
    r += 2
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
    c = ws.cell(r, 1, t); c.font = font(bold=True, size=12, color=NAVY); c.fill = PatternFill('solid', fgColor=GROUP)
    ws.row_dimensions[r].height = 22
def head(cols):
    global r
    r += 1
    for j, h in enumerate(cols, 1):
        c = ws.cell(r, j, h); c.font = font(bold=True, color='FFFFFF', size=10); c.fill = PatternFill('solid', fgColor=NAVY)
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = BOX
    ws.row_dimensions[r].height = 30
def row(vals, fmts=None, hl=False):
    global r
    r += 1
    for j, v in enumerate(vals, 1):
        c = ws.cell(r, j, v); c.border = BOX
        c.fill = PatternFill('solid', fgColor=HL if hl else (TINT if r % 2 == 0 else 'FFFFFF'))
        c.font = font(size=10, bold=hl or j == 1)
        c.alignment = Alignment(horizontal='left' if j <= 2 else 'center', vertical='center', wrap_text=True)
        if fmts and fmts[j - 1]: c.number_format = fmts[j - 1]
    return r
gain = lambda a, b: a / b - 1

# 1 ── final comparison
v8 = FND('v8_center')
title('1. Final comparison — the best version of every protocol')
head(['Protocol', 'Family', 'FND', 'HND', 'LND', 'PDR', 'FND far BS', 'v8 gain (FND)'])
FAM = [('LEACH', 'classic', 'leach_EDITED'), ('HEED', 'classic', 'heed_EDITED'), ('PEGASIS', 'classic', 'pegasis_EDITED'),
       ('SH-LEACH+', 'hybrid, after our fix', 'shleach_IMPROVED'), ('H-LEACH+', 'hybrid, after our fix', 'hleach_IMPROVED'),
       ('EECH-HEED+', 'recent hybrid, after our fix', 'eechheed_IMPROVED')]
f = [None, None, '#,##0', '#,##0', '#,##0', '0.00%', '#,##0', '+0%;-0%']
chart_first = r + 1
for n, fam, k in FAM:
    a = rec(k); row([n, fam, *a, FND(k + '_farBS'), gain(v8, a[0])], f)
row(['v8 (main)', 'proposed', *rec('v8_center'), FND('v8_farBS'), '—'], f, hl=True)
chart_last = row(['v8-Chain (far BS)', 'proposed', *rec('v8_chain_center'), FND('v8_chain_farBS'), '—'], f, hl=True)

# 2 ── hybrids
title('2. The three hybrids — before and after our fix (FND)')
head(['Protocol', 'Problem we found', 'Paper settings', 'Same env. (as published)', 'After our fix', 'Change', 'Far BS after fix', ''])
HY = [('SH-LEACH', 'round counter never resets → too many CHs', 'shleach'), ('H-LEACH', 'deadlock (E > average) + no G-set', 'hleach'),
      ('EECH-HEED', 'rotation of 1 round in zone 2', 'eechheed')]
for n, p, k in HY:
    e, i = FND(k + '_EDITED'), FND(k + '_IMPROVED')
    row([n, p, FND(k + '_ORIGINAL'), e, i, gain(i, e), FND(k + '_IMPROVED_farBS'), ''], [None, None, '#,##0', '#,##0', '#,##0', '+0.0%;-0.0%', '#,##0', None])
row(['LEACH (reference)', '—', FND('leach_ORIGINAL'), FND('leach_EDITED'), '—', '—', FND('leach_EDITED_farBS'), ''], [None, None, '#,##0', '#,##0', None, None, '#,##0', None])

# 3 ── our versions
title('3. Our protocol — one change per version (BS at the centre)')
head(['Version', 'What changed', 'FND', 'HND', 'LND', 'PDR', 'FND change', ''])
EV = [('v1', 'HEED election + LEACH join', 'v1_heed_election_leach_join'), ('v2', '+ fairness penalty', 'v2_fairness_penalty'),
      ('v3', 'single-pass score + 5-round reuse', 'v3_single_pass_reuse_int5'), ('v4', 'reuse 15 rounds', 'v4_reuse_int15'),
      ('v5', '+ backup CH (interval 15)', 'v5_backup_int15'), ('v5b', 'backup + repair, interval 5, energy check', 'v5b_energy_aware_repair'),
      ('v6', 'ordered CH chain', 'v6_chain_center'), ('v7', 'chain + backup + repair', 'v7_chain_backup_center'),
      ('v7.1', 'greedy multi-hop tree', 'v7_1_multihop_int5'), ('v8', 'v5b + I1–I5', 'v8_center'), ('v8-Chain', 'v8 + energy-aware relay', 'v8_chain_center')]
prev = None
for n, d, k in EV:
    a = rec(k)
    row([n, d, *a, gain(a[0], prev) if prev else '—', ''], [None, None, '#,##0', '#,##0', '#,##0', '0.00%', '+0.0%;-0.0%', None], hl=n in ('v8', 'v8-Chain'))
    prev = a[0]

# 4 ── ablation
title('4. Which part of v8 matters? (v8 with one improvement switched off)')
head(['Run', 'Switched off', 'FND', 'HND', 'LND', 'PDR', 'FND change', ''])
row(['v8 (full)', '—', *rec('v8_center'), '—', ''], [None, None, '#,##0', '#,##0', '#,##0', '0.00%', None, None], hl=True)
for i, d in enumerate(['I1 epoch fix', 'I2 handover', 'I3 re-join', 'I4 direct-to-BS', 'I5 energy gate'], 1):
    a = rec(f'v8_without_I{i}')
    row([f'v8 − I{i}', d, *a, gain(a[0], v8), ''], [None, None, '#,##0', '#,##0', '#,##0', '0.00%', '+0.0%;-0.0%', None])
rob = [FND(k) for k in S if k.startswith('v8_center_seed')]
r += 1
ws.merge_cells(start_row=r + 1, start_column=1, end_row=r + 1, end_column=8)
c = ws.cell(r + 1, 1, f'Robustness: v8 on 8 random topologies → FND {min(rob)} – {max(rob)} (mean {sum(rob) / len(rob):.0f}).')
c.font = font(bold=True, size=11, color=NAVY); c.fill = PatternFill('solid', fgColor='FFF7E6'); c.border = BOX
r += 1

# chart: FND centre vs far for section 1
ch = BarChart(); ch.type = 'col'; ch.title = 'First node death — BS at the centre vs far away'; ch.y_axis.title = 'FND (rounds)'
ch.add_data(Reference(ws, min_col=3, min_row=chart_first - 1, max_row=chart_last), titles_from_data=True)
ch.add_data(Reference(ws, min_col=7, min_row=chart_first - 1, max_row=chart_last), titles_from_data=True)
ch.set_categories(Reference(ws, min_col=1, min_row=chart_first, max_row=chart_last))
ch.height, ch.width = 9, 22
ws.add_chart(ch, 'J4')
ws.freeze_panes = 'A4'
ws.page_setup.orientation = 'landscape'; ws.sheet_properties.pageSetUpPr.fitToPage = True; ws.page_setup.fitToHeight = 0
wb.save(OUT); print('saved', OUT)
