// State-of-the-Art report — short version: what we did, results, comparisons, charts
// Run: NODE_PATH=<node_modules> node build_sota.js
const path = require('path');
const C = require('./common.js');
const { P, H1, H2, B, N, img, table, callout, spacer, pageBreak, doc, titlePage, save, TEXT_W } = require('./docx_lib.js');

const g = C.get, pct = C.pct, F = r => g(r).F;
const v8c = g('v8_chain_center'), v8f = g('v8_farBS'), v8cf = g('v8_chain_farBS');
const best = g('shleach_IMPROVED'), leach = g('leach_EDITED');
const rC = C.robust('v8_chain_center');
const b = t => ({ text: t, bold: true });
const row = (n, r) => { const x = g(r); return [n, x.F, x.H, x.L, pct(x.P)]; };
const W5 = [3638, 1500, 1500, 1500, 1500];
const cen = { center: j => j > 0 };

const body = [
  ...titlePage('State-of-the-Art Report', 'Energy-efficient clustering in WSNs — what we did, what we found, and the proposed v8-Chain',
    ['Eng. Rahma Khaled Oshba', 'Supervisors: Dr. Hesham ElZouka · Dr. Amani Saad · Dr. Khaled Saada', 'All numbers come from the repository results/ folder (ns-3.41).'],
    ['1. What we did', '2. Setup', '3. Classic protocols', '4. Hybrid protocols', '5. Recent work', '6. Proposed protocol (v1 → v8-Chain)',
      '7. Final comparison', '8. Expected cost of security', '9. Limitations', '10. Conclusion', 'References']),

  H1('1. What we did'),
  N('Reproduced 6 published protocols in ns-3.41: LEACH [1], HEED [3], PEGASIS [4], SH-LEACH [5], H-LEACH [6], EECH-HEED [7].'),
  N('ORIGINAL: ran each one in its own paper\'s settings to check the code against the paper.'),
  N('EDITED: ran all of them in one unified environment for a fair comparison.'),
  N('IMPROVED: found and fixed one design flaw in each hybrid.'),
  N('PROPOSED: built a new protocol one change at a time, v1 → v8-Chain.'),
  N('Estimated the energy cost of adding hybrid cryptography.'),
  callout('Main result', [`v8-Chain: FND ${v8c.F} · HND ${v8c.H} · LND ${v8c.L} · PDR ${pct(v8c.P)}.`,
    `First node dies ${C.gain(v8c.F, best.F).toFixed(0)} % later than the best fixed hybrid (SH-LEACH+, ${best.F}) and ${C.gain(v8c.F, leach.F).toFixed(0)} % later than LEACH (${leach.F}).`,
    `Stable over 8 random topologies (FND ${rC.Fmin} – ${rC.Fmax}).`]),

  H1('2. Setup'),
  table(['Parameter', 'Value'], C.ENV.slice(0, 12), [3600, TEXT_W - 3600]),
  spacer(),
  ...img('e1_energy_distance.png', 6.0, 'Figure 1 — Energy of one 2000-bit packet vs distance (first-order radio model).'),
  B('FND / HND / LND = round in which the first / half / last node dies. PDR = delivered ÷ generated readings.'),

  H1('3. Classic protocols — LEACH, HEED, PEGASIS'),
  H2('3.1 ORIGINAL (paper settings) vs the papers'),
  table(['', 'LEACH', 'HEED', 'PEGASIS'], [['Field / nodes', '50 × 50 m / 100', '100 × 100 m / 500', '50 × 50 m / 100'], ['BS', '(25, −100)', '(50, 175)', '(25, 150)'],
    ['Energy / packet', '0.5 J / 2000 bits', '2 J / 1000 bits × 5', '0.5 J / 2000 bits'], ['Paper FND / HND / LND', '932 / — / 1312', 'graphs only', '1578 / 2082 / 2192'],
    ['Our ORIGINAL', `${F('leach_ORIGINAL')} / ${g('leach_ORIGINAL').H} / ${g('leach_ORIGINAL').L}`, `${F('heed_ORIGINAL')} / ${g('heed_ORIGINAL').H} / ${g('heed_ORIGINAL').L}`, `${F('pegasis_ORIGINAL')} / ${g('pegasis_ORIGINAL').H} / ${g('pegasis_ORIGINAL').L}`]],
  [2600, 2346, 2346, 2346], { center: j => j > 0, hl: i => i === 4 }),
  P('The code matches the papers: LEACH LND +1.1 %, PEGASIS FND / HND / LND +2.4 % / −3.1 % / −0.3 %.'),
  H2('3.2 EDITED (unified environment)'),
  table(['Protocol', 'FND', 'HND', 'LND', 'PDR'], [row('LEACH', 'leach_EDITED'), row('HEED', 'heed_EDITED'), row('HEED + fairness', 'heed_fairness_EDITED'), row('PEGASIS', 'pegasis_EDITED')], W5, cen),
  spacer(),
  ...img('p1_baselines.png', 6.5, 'Figure 2 — Paper vs our ORIGINAL vs our EDITED code.'),
  B('HEED dies first (FND 634): its election messages are paid every round and heard by about 20 neighbours each.'),
  B('PEGASIS: one 91.5 m greedy chain link (above d0) kills node 73 early; its long LND comes from a few nodes near the BS.'),

  H1('4. Hybrid protocols — SH-LEACH, H-LEACH, EECH-HEED'),
  table(['Protocol', 'Flaw found (EDITED)', 'Our fix (IMPROVED)'], [
    ['SH-LEACH [5]', 'round counter r never resets → up to 100 CHs per round', 'counter restarts every 1/C_prob rounds'],
    ['H-LEACH [6]', '"E > average" deadlocks with equal energy; no G-set → bursts of 59 CHs', '"E ≥ average" + LEACH G-set'],
    ['EECH-HEED [7]', 'zone 2: P ≈ 1 → rotation period of 1 round (a node was CH 221 times)', 'zone-2 rotation at the paper\'s 10 %']], [1900, 4000, TEXT_W - 5900]),
  spacer(),
  ...img('h1_hybrid_ch.png', 6.5, 'Figure 3 — Cluster heads per round: paper algorithm (grey) vs our fix (blue).'),
  table(['FND', 'ORIGINAL', 'EDITED', 'IMPROVED'], ['shleach', 'hleach', 'eechheed'].map((k, i) => [['SH-LEACH', 'H-LEACH', 'EECH-HEED'][i], F(k + '_ORIGINAL'), F(k + '_EDITED'), F(k + '_IMPROVED')]),
    [3638, 2000, 2000, 2000], cen),
  spacer(),
  ...img('h2_hybrids_all.png', 6.5, 'Figure 4 — FND / HND / LND of every hybrid version.'),
  P('Lesson: all three add energy to LEACH but break its rotation; restoring the rotation fixes them.'),

  H1('5. Recent work (studied, not re-implemented)'),
  table(['Paper', 'Idea', 'Reported', 'Limitation'], [
    ['RL-ILEACH 2026 [8]', 'Q-learning CH election', '+784 % lifetime vs LEACH', 'FND earlier than ILEACH (524 vs 936)'],
    ['DL-HEED 2025 [9]', 'graph neural network in HEED', 'up to +60 % vs HEED', 'training data, heavy inference'],
    ['TLC 2024 [10]', 'two-level LEACH + distance threshold', 'longer than LEACH variants', 'no CH-failure protection'],
    ['FTEC [11], Pachlor [12], EEUC [13], Chauhan [14]', 'backup CH, rotation review, unequal clusters, relays', '—', 'ideas reused in v5, I2 and the relay rule']],
  [2400, 2700, 2100, TEXT_W - 7200]),

  H1('6. Proposed protocol — v1 → v8-Chain'),
  table(['Version', 'Change', 'FND', 'PDR'], C.EVOLUTION.map(([n, r, d]) => [n, d, F(r), pct(g(r).P)]), [1300, 5138, 1600, 1600], { center: j => j > 1, hl: i => i === 11 }),
  spacer(),
  ...img('f4_evolution.png', 6.3, 'Figure 5 — First node death of every version.'),
  B('v3: single-pass score T(r)·(E/E0)·(1 + deg/deg_max) + 5-round cluster reuse → ×4.9 over v2.'),
  B('v6 / v7: forced CH chains are worse (hot spot near the BS).'),
  B('v8: I1 epoch fix · I2 handover · I3 re-join · I4 direct-to-BS · I5 energy gate (E ≥ average).'),
  B('v8-Chain: relay through another CH only if Tx(c→j) + Rx + E_DA < Tx(c→BS).'),
  ...img('f5_ablation.png', 5.8, 'Figure 6 — Ablation: I4 and I5 carry the gain.'),
  ...img('f6_routing.png', 6.3, `Figure 7 — CH → BS routing: far BS +${C.gain(v8cf.F, v8f.F).toFixed(0)} % with the energy-aware relay (${v8f.F} → ${v8cf.F}).`),
  ...img('f12_architecture.png', 6.5, 'Figure 8 — Architecture of v8-Chain.'),

  H1('7. Final comparison'),
  table(['Protocol', 'FND', 'HND', 'LND', 'PDR'], C.FAMILY.map(([n, r]) => row(n, r)), W5, { center: j => j > 0, hl: i => i === 6 }),
  spacer(),
  ...img('f1_lifetime_families.png', 6.5, 'Figure 9 — Lifetime of the best version of every family.'),
  ...img('c1_fnd_rank.png', 5.8, 'Figure 10 — First node death ranking and the v8-Chain gain.'),
  ...img('f3_alive_curves.png', 6.0, 'Figure 11 — Alive nodes per round.'),
  ...img('f7_robustness.png', 5.8, `Figure 12 — 8 random topologies: v8-Chain FND ${rC.Fmin} – ${rC.Fmax}.`),

  H1('8. Expected cost of security'),
  P('Hybrid cryptography: ECC key agreement once at deployment, AES + 8-byte MIC on every frame. Measured by running v8-Chain with the overhead switched on.'),
  table(['Assumption', 'Value'], [['Extra bits per frame (header + MIC)', '104 bits'], ['AES energy, sender and receiver', '5 nJ/bit (assumed)'], ['ECC key setup, once per node', '20 mJ [16]']], [5000, TEXT_W - 5000]),
  spacer(),
  ...img('s1_security.png', 6.3, 'Figure 13 — FND of v8-Chain with security overhead.'),
  P(`Expected FND loss: 9 – 19 %. With everything on, FND = ${F('v8_chain_mic104_aes5nJ_ecc20mJ_center')} — still +${C.gain(F('v8_chain_mic104_aes5nJ_ecc20mJ_center'), leach.F).toFixed(0)} % over LEACH without security.`),

  H1('9. Limitations'),
  B('Analytical radio model for the long runs (no collisions or retransmissions); packet-level only in the small demo.'),
  B('100 static nodes with equal energy in one 100 × 100 m field.'),
  B('Security costs are assumed values; attacks and key management are not simulated.'),
  B('Missing paper details (packet size, sensor signal) had to be assumed.'),

  H1('10. Conclusion'),
  B('The reproduced protocols match their papers; in a fair environment LEACH has the best first death of the classic protocols.'),
  B('The three hybrids fail because they break LEACH\'s rotation; one-line fixes restore them.'),
  B(`v8-Chain has the latest first node death of all (FND ${v8c.F}, PDR ${pct(v8c.P)}) and gains more when the BS is far away.`),
  B('Adding hybrid cryptography is expected to cost 9 – 19 % of lifetime and remains affordable.'),

  H1('References'),
  ...C.REFS.map((r, i) => P(`[${i + 1}]  ${r}`, { spacing: { after: 100 } })),
];

save(doc('State-of-the-Art Report — v8-Chain', body, { headerText: 'State-of-the-Art Report · Energy-efficient clustering in WSNs' }),
  path.join(__dirname, '..', 'SOTA_Report_v8-Chain.docx'));
