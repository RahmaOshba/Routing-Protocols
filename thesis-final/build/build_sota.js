// State-of-the-Art report — short version: what we did, results, comparisons, charts
// Run: NODE_PATH=<node_modules> node build_sota.js
const path = require('path');
const C = require('./common.js');
const { P, H1, H2, H3, B, N, img, table, callout, spacer, doc, titlePage, save, TEXT_W } = require('./docx_lib.js');

const g = C.get, pct = C.pct, F = r => g(r).F, FF = r => g(r + '_farBS').F;
const v8 = g('v8_center'), v8f = g('v8_farBS'), v8cf = g('v8_chain_farBS');
const best = g('shleach_IMPROVED'), leach = g('leach_EDITED');
const r8 = C.robust('v8_center');
const b = t => ({ text: t, bold: true });
const row = (n, r) => { const x = g(r); return [n, x.F, x.H, x.L, pct(x.P)]; };
const W5 = [3638, 1500, 1500, 1500, 1500];
const cen = { center: j => j > 0 };
const chg = (a, c) => (a >= c ? '+' : '−') + (Math.abs(a - c) / c * 100).toFixed(1) + '%';
const CL = [['LEACH', 'leach'], ['HEED', 'heed'], ['PEGASIS', 'pegasis']];
const HY = [['SH-LEACH', 'shleach'], ['H-LEACH', 'hleach'], ['EECH-HEED', 'eechheed']];
let fig = 0;
const fg = (file, w, cap) => img(file, w, `Figure ${++fig} — ${cap}`);
const eqn = (file, w) => img(file, w);
const SH = f => path.join(C.ROOT, 'figures', 'ns3_screens', f);
const SG = (p, bs, k) => g(`sec_${p}_${bs}_${k}`);

function hybrid(n, k, idea, probs, fixes) {
  const o = g(k + '_ORIGINAL'), e = g(k + '_EDITED'), m = g(k + '_IMPROVED');
  return [H3(n),
    P([b('Idea. '), idea]),
    P([b('Problems found:')]), ...probs.map(t => B(t)),
    P([b('Our fix:')]), ...fixes.map(t => B(t)),
    table(['Version', 'FND', 'HND', 'LND', 'PDR', 'FND far BS'], [['ORIGINAL (paper settings)', o.F, o.H, o.L, pct(o.P), '—'], ['EDITED (unified)', e.F, e.H, e.L, pct(e.P), FF(k + '_EDITED')],
      ['IMPROVED (our fix)', m.F, m.H, m.L, pct(m.P), FF(k + '_IMPROVED')]], [3000, 1200, 1200, 1200, 1400, 1638], { center: j => j > 0, hl: i => i === 2 }),
    P(`Result of the fix: FND ${e.F} → ${m.F} (${chg(m.F, e.F)}) with the BS at the centre; ${FF(k + '_EDITED')} → ${FF(k + '_IMPROVED')} (${chg(FF(k + '_IMPROVED'), FF(k + '_EDITED'))}) with the BS far away.`)];
}

const body = [
  ...titlePage('State-of-the-Art Report', 'Energy-efficient clustering in WSNs — what we did, what we found, and the proposed protocol v8 (+ v8-Chain for a far base station)',
    ['Eng. Rahma Khaled Oshba', 'Supervisors: Dr. Hesham ElZouka · Dr. Amani Saad · Dr. Khaled Saada', 'All numbers come from the repository results/ folder (ns-3.41).'],
    ['1. What we did', '2. Setup and energy model', '3. Classic protocols', '4. Hybrid protocols', '5. Recent work', '6. Proposed protocol (v1 → v8, v8-Chain)',
      '7. Final comparison — BS at the centre', '8. Final comparison — BS far away', '9. Security — the hybrid scheme of the proposal', '10. Limitations', '11. Conclusion', 'References']),

  H1('1. What we did'),
  N('Reproduced 6 published protocols in ns-3.41: LEACH [1], HEED [3], PEGASIS [4], SH-LEACH [5], H-LEACH [6], EECH-HEED [7].'),
  N('ORIGINAL: ran each one in its own paper\'s settings to check the code against the paper.'),
  N('EDITED: ran all of them in one unified environment for a fair comparison.'),
  N('IMPROVED: found and fixed one design flaw in each hybrid.'),
  N('PROPOSED: built a new protocol one change at a time, v1 → v8, plus v8-Chain for a far base station.'),
  N('Tested every protocol with the BS at the centre and far away, and tested the hybrid cryptography of the proposal (AES + RSA / ECC) against no security and full RSA.'),
  callout('Main result', [`v8 (main protocol, BS at the centre): FND ${v8.F} · HND ${v8.H} · LND ${v8.L} · PDR ${pct(v8.P)} — ${C.gain(v8.F, best.F).toFixed(0)} % later first death than the best fixed hybrid (SH-LEACH+, ${best.F}) and ${C.gain(v8.F, leach.F).toFixed(0)} % later than LEACH (${leach.F}).`,
    `v8-Chain (= v8 + energy-aware relay, for a far BS): FND ${v8cf.F} with the BS at (50, −100) — ${C.gain(v8cf.F, v8f.F).toFixed(0)} % over v8 and ${C.gain(v8cf.F, FF('eechheed_IMPROVED')).toFixed(0)} % over the best other protocol.`,
    `Stable over 8 random topologies (v8 FND ${r8.Fmin} – ${r8.Fmax}).`]),

  H1('2. Setup and energy model'),
  table(['Parameter', 'Value'], C.ENV.slice(0, 12), [3600, TEXT_W - 3600]),
  spacer(),
  ...eqn('eq_energy.png', 3.6),
  ...fg('e1_energy_distance.png', 6.0, 'Energy of one 2000-bit packet vs distance (first-order radio model).'),
  B('FND / HND / LND = round in which the first / half / last node dies. PDR = delivered ÷ generated readings.'),
  H2('2.1 First experiments in ns-3 (screenshots)'),
  P('Tools: Ubuntu in VMware, ns-3.41 built from source, NetAnim for animation and Wireshark for the captured frames. Every experiment is a C++ file in scratch/ and runs with ./ns3 run.'),
  ...fg(SH('run_template.png'), 6.3, 'First run: the ns-3 scratch simulator works.'),
  P('Experiment 1 — WSN-Day3: 3 sensors send 5 packets each to one sink over the real IEEE 802.15.4 (lr-wpan) MAC. Each data frame asks for an ACK; the MAC confirms SUCCESS when the ACK arrives. Result: 15 / 15, PDR 100 %.'),
  ...fg(SH('day3_terminal.png'), 5.6, 'WSN-Day3: send → receive (LQI 255) → MAC confirm SUCCESS.'),
  ...fg(SH('day3_summary.png'), 5.0, 'WSN-Day3 summary: every packet received and acknowledged.'),
  P('Experiment 2 — wsn_first_packet: the energy model is added (100 J per node, one 50-byte packet every 10 s for 1000 s). 300 / 300 packets arrive, but every node uses ≈ 62.6 J, because the radio spends energy even when it only listens.'),
  ...fg(SH('first_packet_energy.png'), 4.2, 'wsn_first_packet: energy and delivery results.'),
  ...fg(SH('first_netanim.png'), 5.0, 'NetAnim: packets moving to the sink.'),
  ...fg(SH('netanim_stats.png'), 4.2, 'NetAnim Stats → Counter Tables: remaining energy of each node over time.'),
  P('Reading the frames in Wireshark: every data frame (31 bytes) from a sensor to the sink (0x0004) is answered by a 5-byte ACK about 0.2 ms later. The “LwMesh” label is only a Wireshark guess and can be switched off (Analyze → Enabled Protocols → untick LWM). The FCS is valid because checksums are enabled in the code.'),
  ...fg(SH('wireshark_day3.png'), 6.3, 'Wireshark: WSN-Day3 capture at the sink.'),
  ...fg('k2_frame_decode.png', 6.5, 'Frame 1 byte by byte: 9 header + 20 payload + 2 FCS = 31 bytes.'),
  P('Demo — clustered WSN: 12 sensors, 3 clusters, 1 sink, the CH rotates every round, TDMA slots and fusion. 72 readings, PDR 100 %, but only 18 packets reach the sink instead of 72.'),
  ...fg(SH('demo_terminal.png'), 4.6, 'Demo: every packet printed (member → CH, fusion, CH → sink).'),
  ...fg(SH('demo_results.png'), 4.6, 'Demo results.'),
  ...fg(SH('demo_netanim.png'), 6.0, 'Demo in NetAnim: red = CHs, colours = clusters, gold = sink.'),
  ...fg(SH('wireshark_demo.png'), 6.0, 'Demo in Wireshark: 51-byte data frames (9 + 40 + 2) and 5-byte ACKs.'),

  H1('3. Classic protocols — LEACH, HEED, PEGASIS'),
  H2('3.1 Key equations'),
  ...eqn('eq_leach.png', 5.2), ...eqn('eq_heed.png', 5.6), ...eqn('eq_pegasis.png', 2.4),
  H2('3.2 ORIGINAL — paper settings, paper vs our code'),
  table(['', 'LEACH', 'HEED', 'PEGASIS'], [['Field / nodes', '50 × 50 m / 100', '100 × 100 m / 500', '50 × 50 m / 100'], ['BS', '(25, −100)', '(50, 175)', '(25, 150)'],
    ['Energy / packet', '0.5 J / 2000 bits', '2 J / 1000 bits × 5', '0.5 J / 2000 bits'], ['Radio', 'one amplifier 100 pJ', 'two-slope, d0 = 75 m', 'one amplifier 100 pJ']],
  [2600, 2346, 2346, 2346], { center: j => j > 0 }),
  spacer(),
  table(['Protocol', 'Metric', 'Paper', 'Our code', 'Difference'], [
    ['LEACH', 'FND', 932, F('leach_ORIGINAL'), chg(F('leach_ORIGINAL'), 932)], ['LEACH', 'LND', 1312, g('leach_ORIGINAL').L, chg(g('leach_ORIGINAL').L, 1312)],
    ['HEED', 'FND / HND / LND', 'graphs only', `${F('heed_ORIGINAL')} / ${g('heed_ORIGINAL').H} / ${g('heed_ORIGINAL').L}`, '—'],
    ['PEGASIS', 'FND', 1578, F('pegasis_ORIGINAL'), chg(F('pegasis_ORIGINAL'), 1578)], ['PEGASIS', 'HND', 2082, g('pegasis_ORIGINAL').H, chg(g('pegasis_ORIGINAL').H, 2082)],
    ['PEGASIS', 'LND', 2192, g('pegasis_ORIGINAL').L, chg(g('pegasis_ORIGINAL').L, 2192)]], [1900, 2000, 1900, 2000, 1838], { center: j => j > 0 }),
  ...fg('f9_validation.png', 5.8, 'Published values vs our ORIGINAL code.'),
  H2('3.3 EDITED — unified environment'),
  table(['Protocol', 'FND', 'HND', 'LND', 'PDR'], [row('LEACH', 'leach_EDITED'), row('HEED', 'heed_EDITED'), row('HEED + fairness', 'heed_fairness_EDITED'), row('PEGASIS', 'pegasis_EDITED')], W5, cen),
  ...fg('pdr_classic.png', 5.0, 'PDR of the classic protocols (EDITED).'),
  H2('3.4 Comparison — ORIGINAL vs EDITED'),
  table(['Protocol', 'Metric', 'ORIGINAL', 'EDITED', 'Change'], CL.flatMap(([n, k]) => [['FND', 'F'], ['HND', 'H'], ['LND', 'L']].map(([m, f]) => [n, m, g(k + '_ORIGINAL')[f], g(k + '_EDITED')[f], chg(g(k + '_EDITED')[f], g(k + '_ORIGINAL')[f])])),
    [1900, 1400, 2100, 2100, 2138], { center: j => j > 0 }),
  ...fg('p1_baselines.png', 6.5, 'Paper vs our ORIGINAL vs our EDITED code.'),
  P([b('Why the numbers changed:')]),
  B([b('LEACH ↑: '), 'amplifier 10× cheaper (10 vs 100 pJ) and the BS at the centre instead of 100–150 m away.']),
  B([b('HEED ↓: '), 'one election per data packet instead of per 5 packets; every election message is heard by about 20 neighbours; 0.5 J instead of 2 J.']),
  B([b('PEGASIS FND ↓, LND ↑: '), 'a bigger field gives one 91.5 m greedy link (above d0) that kills node 73 early; the last nodes near the BS live very long.']),
  H2('3.5 BS far away (50, −100)'),
  table(['Protocol', 'FND centre', 'FND far', 'HND far', 'LND far', 'PDR far', 'FND change'], CL.map(([n, k]) => { const c = g(k + '_EDITED'), f = g(k + '_EDITED_farBS');
    return [n, c.F, f.F, f.H, f.L, pct(f.P), chg(f.F, c.F)]; }), [1600, 1300, 1300, 1300, 1300, 1300, 1538], cen),
  P('LEACH and HEED lose 29 % and 48 % of their FND because every CH sends far (d⁴); PEGASIS keeps its FND because only one leader talks to the BS.'),
  H2('3.6 Summary of the classic protocols'),
  ...CL.flatMap(([n, k]) => { const o = g(k + '_ORIGINAL'), e = g(k + '_EDITED'), f = g(k + '_EDITED_farBS');
    const t = { leach: ['random rotation with an epoch (set G)', 'energy-blind; setup every round'], heed: ['residual energy + neighbours, iterative election', 'election messages every round'],
      pegasis: ['one chain, one leader to the BS', 'long chain links, delay, single leader'] }[k];
    return [B([b(n + ': '), `idea — ${t[0]}; weakness — ${t[1]}; FND paper settings ${o.F}, unified centre ${e.F}, unified far ${f.F}; PDR ${pct(e.P)}.`])]; }),

  H1('4. Hybrid protocols — SH-LEACH, H-LEACH, EECH-HEED'),
  P('Introduction. A LEACH + HEED hybrid keeps LEACH\'s simple random election, rotation (epoch, G-set), nearest-CH join, TDMA and fusion, and adds HEED\'s energy awareness (residual energy, node degree). The three papers below follow this idea, and so does our protocol.'),
  H2('4.1 Key equations'),
  ...eqn('eq_shleach.png', 4.4), ...eqn('eq_hleach.png', 6.3), ...eqn('eq_eech.png', 6.3),
  H2('4.2 ORIGINAL — paper settings, paper vs our code'),
  table(['', 'SH-LEACH [5]', 'H-LEACH [6]', 'EECH-HEED [7]'], [['Deployment', '100 nodes, 100 × 100 m', '100 nodes, 100 × 100 m', '30 near BS + 70 far, 14 advanced'],
    ['Energy', '0.5 J', '0.5 J', '0.3 – 1.5 J (≈ 56 J)'], ['Packet', '2000 bits (assumed)', '4000 bits', '4000 bits, E_DA 50 nJ'], ['Other', 'one amplifier 100 pJ', 'no setup messages', 'adaptive sensing ON']],
  [2000, 2500, 2500, 2638], { center: j => j > 0 }),
  spacer(),
  table(['Protocol', 'Metric', 'Paper', 'Our code', 'Difference'], [
    ['SH-LEACH', 'FND / HND / LND', 'graphs only', `${F('shleach_ORIGINAL')} / ${g('shleach_ORIGINAL').H} / ${g('shleach_ORIGINAL').L}`, '—'],
    ['H-LEACH', 'LND', '≈ 4312', g('hleach_ORIGINAL').L, 'not reachable with 4000-bit packets'],
    ['EECH-HEED', 'FND', 1250, F('eechheed_ORIGINAL'), chg(F('eechheed_ORIGINAL'), 1250)], ['EECH-HEED', 'HND', 1650, g('eechheed_ORIGINAL').H, chg(g('eechheed_ORIGINAL').H, 1650)],
    ['EECH-HEED', 'LND', 2200, g('eechheed_ORIGINAL').L, chg(g('eechheed_ORIGINAL').L, 2200)], ['EECH-HEED', 'PDR', '95 %', pct(g('eechheed_ORIGINAL').P), '—']],
  [1900, 1900, 1700, 2000, 2138], { center: j => j > 0 }),
  H2('4.3 Each hybrid: idea, problems, fix and results'),
  ...hybrid('SH-LEACH', 'shleach', 'LEACH + residual energy + the round number r in the probability.',
    ['r is never reset, so the probability keeps growing.', 'CHs grow to 100 per round: every node sends alone to the BS (FND 647).'],
    ['r restarts every 1/C_prob = 10 rounds, like LEACH\'s epoch (one line of code).']),
  ...hybrid('H-LEACH', 'hleach', 'LEACH threshold with a personal, energy-based probability; a node may be CH only if its energy is above the network average.',
    ['With equal starting energy nobody is above the average → no CH in round 1 (deadlock).', 'No G-set → bursts of up to 59 CHs; the same node can repeat.'],
    ['"E > average" → "E ≥ average".', 'LEACH G-set restored.']),
  ...hybrid('EECH-HEED', 'eechheed', 'Two zones: HEED near the BS, energy × node degree far away; relays between CHs; adaptive sensing.',
    ['Zone 2: P ≈ 1 → rotation period 1/P ≈ 1 round → the G-set blocks nobody.', 'The same border nodes are CH every other round (221 times in 1000 rounds) and die first.', 'Its advantage in the paper comes from sensing less and ≈ 56 J of energy.'],
    ['Zone-2 rotation fixed at the paper\'s 10 % (10 rounds); energy × degree kept as a weight.']),
  ...fg('h1_hybrid_ch.png', 6.5, 'Cluster heads per round: paper algorithm (grey) vs our fix (blue).'),
  ...eqn('eq_fixes.png', 4.4),
  H2('4.4 The three hybrids compared'),
  table(['Protocol', 'Problem', 'Fix', 'FND EDITED → IMPROVED', 'FND far (IMPROVED)', 'PDR'], HY.map(([n, k], i) => [n, ['counter never resets', 'deadlock + no G-set', '1-round rotation in zone 2'][i],
    ['counter restarts', '≥ average + G-set', 'fixed 10-round rotation'][i], `${F(k + '_EDITED')} → ${F(k + '_IMPROVED')} (${chg(F(k + '_IMPROVED'), F(k + '_EDITED'))})`, FF(k + '_IMPROVED'), pct(g(k + '_IMPROVED').P)])
    .concat([['LEACH (reference)', '—', '—', String(leach.F), FF('leach_EDITED'), pct(leach.P)]]), [1500, 1800, 1700, 2000, 1400, 1238], { center: j => j > 2 }),
  ...fg('h2_hybrids_all.png', 6.5, 'FND / HND / LND of every hybrid version.'),
  ...fg('pdr_hybrids.png', 5.5, 'PDR of every hybrid version.'),
  P([b('Lesson: '), 'all three add energy to LEACH but break its rotation; restoring a fixed rotation fixes them. After the fix SH-LEACH+ is the best hybrid with the BS at the centre and EECH-HEED+ with the BS far away.']),

  H1('5. Recent work (studied, not re-implemented)'),
  table(['Paper', 'Idea', 'Reported', 'Limitation'], [
    ['RL-ILEACH 2026 [8]', 'Q-learning CH election', '+784 % lifetime vs LEACH', 'FND earlier than ILEACH (524 vs 936)'],
    ['DL-HEED 2025 [9]', 'graph neural network in HEED', 'up to +60 % vs HEED', 'training data, heavy inference'],
    ['TLC 2024 [10]', 'two-level LEACH + distance threshold', 'longer than LEACH variants', 'no CH-failure protection'],
    ['FTEC [11], Pachlor [12], EEUC [13], Chauhan [14]', 'backup CH, rotation review, unequal clusters, relays', '—', 'ideas reused in v5, I2 and the relay rule']],
  [2400, 2700, 2100, TEXT_W - 7200]),

  H1('6. Proposed protocol — v1 → v8, and v8-Chain'),
  P([b('v8 is the main protocol. '), 'v8-Chain = v8 + an energy-aware relay between CHs; it gives the same result as v8 when the BS is at the centre and is used only when the BS is far away.']),
  table(['Version', 'What changed', 'FND', 'HND', 'LND', 'PDR', 'FND change'], C.EVOLUTION.map(([n, r, d], i) => { const x = g(r);
    return [n, d, x.F, x.H, x.L, pct(x.P), i ? chg(x.F, g(C.EVOLUTION[i - 1][1]).F) : '—']; }), [1000, 3300, 900, 900, 900, 1200, 1438], { center: j => j > 1, hl: i => i === 10 || i === 11 }),
  P('FND change = compared with the previous version.'),
  ...fg('f4_evolution.png', 6.3, 'First node death of every version.'),
  ...fg('pdr_versions.png', 6.3, 'PDR of every version.'),
  B('v3: single-pass score + 5-round cluster reuse → ×4.9 over v2:'), ...eqn('eq_score.png', 3.6),
  B('v6 / v7: forced CH chains are worse (hot spot near the BS).'),
  B('v8: I1 epoch fix · I2 handover · I3 re-join · I4 direct-to-BS · I5 energy gate (E ≥ average).'),
  B('v8-Chain: a CH relays through CH j only if'), ...eqn('eq_relay.png', 5.0),
  ...fg('f5_ablation.png', 5.8, 'Ablation: I4 and I5 carry the gain.'),
  ...fg('f6_routing.png', 6.3, `CH → BS routing: far BS +${C.gain(v8cf.F, v8f.F).toFixed(0)} % with the energy-aware relay (${v8f.F} → ${v8cf.F}); no change at the centre.`),
  ...fg('f12_architecture.png', 6.5, 'Architecture of v8 (the relay box is active only in v8-Chain).'),

  H1('7. Final comparison — BS at the centre'),
  table(['Protocol', 'FND', 'HND', 'LND', 'PDR'], C.FAMILY.map(([n, r]) => row(n, r)), W5, { center: j => j > 0, hl: i => i === 6 }),
  ...fg('f1_lifetime_families.png', 6.5, 'Lifetime of the best version of every family.'),
  ...fg('c1_fnd_rank.png', 5.8, 'First node death ranking and the v8 gain.'),
  ...fg('f3_alive_curves.png', 6.0, 'Alive nodes per round.'),
  ...fg('f7_robustness.png', 5.8, `8 random topologies: v8 FND ${r8.Fmin} – ${r8.Fmax}.`),

  H1('8. Final comparison — BS far away'),
  table(['Protocol', 'FND centre', 'FND far', 'HND far', 'LND far', 'PDR far'], [['LEACH', 'leach_EDITED'], ['HEED', 'heed_EDITED'], ['PEGASIS', 'pegasis_EDITED'], ['SH-LEACH+', 'shleach_IMPROVED'],
    ['H-LEACH+', 'hleach_IMPROVED'], ['EECH-HEED+', 'eechheed_IMPROVED']].map(([n, r]) => { const f = g(r + '_farBS'); return [n, F(r), f.F, f.H, f.L, pct(f.P)]; })
    .concat([['v8', v8.F, v8f.F, v8f.H, v8f.L, pct(v8f.P)], ['v8-Chain', F('v8_chain_center'), v8cf.F, v8cf.H, v8cf.L, pct(v8cf.P)]]),
  [2400, 1450, 1450, 1450, 1450, 1438], { center: j => j > 0, hl: i => i === 7 }),
  ...fg('far_fnd.png', 6.5, 'FND with the BS at the centre (grey) and far away (colour).'),
  ...fg('far_rank.png', 5.8, 'FND ranking with the BS far away.'),
  B(`With a far BS v8 alone (${v8f.F}) is only slightly better than EECH-HEED+ (${FF('eechheed_IMPROVED')}).`),
  B(`v8-Chain reaches ${v8cf.F}: +${C.gain(v8cf.F, v8f.F).toFixed(0)} % over v8, +${C.gain(v8cf.F, FF('eechheed_IMPROVED')).toFixed(0)} % over EECH-HEED+, +${C.gain(v8cf.F, FF('pegasis_EDITED')).toFixed(0)} % over PEGASIS and +${C.gain(v8cf.F, FF('leach_EDITED')).toFixed(0)} % over LEACH.`),

  H1('9. Security — the hybrid scheme of the proposal'),
  P('The thesis proposal: symmetric cryptography inside the cluster, public-key cryptography only between the CH and the sink, the sink authenticates the CHs and gives them credentials; compare with no security and with full RSA. We added these costs to LEACH, PEGASIS and v8 / v8-Chain with compiler flags (all 0 by default, so every other result is unchanged).'),
  ...fg('s4_sec_scheme.png', 6.0, 'The hybrid scheme: AES + MIC in the cluster, public key only for CH authentication with the sink.'),
  ...eqn('eq_security.png', 5.0),
  H2('9.1 Why not RSA for everything'),
  ...fg('s5_sec_ops.png', 6.3, 'Energy of one operation on an 8-bit sensor MCU (ATmega128) [16], log scale.'),
  B('RSA-decrypting one 2000-bit reading (3 RSA-1024 blocks) costs 912 mJ — more than the whole 500 mJ battery.'),
  B('AES on the same reading costs about 10 µJ (≈ 90 000 times less).'),
  B('With the heavy private-key work done by the mains-powered sink, the node side of RSA key transport costs 15.4 mJ; ECDH-160 costs 22.3 mJ.'),
  H2('9.2 Scenarios'),
  table(['Scenario', 'Every message', 'Public key', 'What a node pays'], [
    ['No security', '—', '—', 'nothing'],
    ['AES + MIC only', 'AES + MIC', '— (keys pre-loaded)', '+104 bits, 5 nJ/bit'],
    ['Hybrid — once per node', 'AES + MIC', 'once at deployment', '+15.4 mJ (RSA) / 22.3 mJ (ECC) once'],
    ['Hybrid — per new CH', 'AES + MIC', 'every time a node becomes CH', '+15.4 / 22.3 mJ per election'],
    ['Full ECC', 'ECIES', 'every packet', '22.3 mJ send + 22.3 mJ receive'],
    ['Full RSA', 'RSA-1024 (3 blocks)', 'every packet', '35.7 mJ send + 912 mJ receive']], [2300, 1900, 2200, TEXT_W - 6400]),
  H2('9.3 Results'),
  table(['Scenario', 'LEACH', 'PEGASIS', 'v8', 'LEACH far', 'PEGASIS far', 'v8-Chain far'],
    [['No security', 's0_none'], ['AES + MIC only', 's1_aes_only'], ['Hybrid RSA once', 's6_once_rsa'], ['Hybrid ECC once', 's7_once_ecc'],
     ['Hybrid RSA per CH', 's2_hybrid_rsa'], ['Hybrid ECC per CH', 's3_hybrid_ecc'], ['Full ECC', 's4_full_ecc'], ['Full RSA', 's5_full_rsa']]
      .map(([n, k]) => [n, ...[['leach', 'center'], ['pegasis', 'center'], ['v8', 'center'], ['leach', 'far'], ['pegasis', 'far'], ['v8chain', 'far']].map(([p, bs]) => { const x = SG(p, bs, k); return `${x.F} (${pct(x.P)})`; })]),
    [1900, 1180, 1180, 1180, 1180, 1190, TEXT_W - 7810], { center: j => j > 0, hl: i => i === 2 || i === 3 }),
  P('FND in rounds, PDR in brackets.', { spacing: { after: 120 } }),
  ...fg('s2_sec_center.png', 6.5, 'FND with each security scheme, BS at the centre.'),
  ...fg('s2_sec_far.png', 6.5, 'FND with each security scheme, BS far away.'),
  ...fg('s3_sec_pdr.png', 6.5, 'PDR with each security scheme, BS at the centre.'),
  H2('9.4 What we learn'),
  B('Full RSA / full ECC is impossible: FND 1 – 203 rounds and PDR 3 – 24 %. A CH cannot pay 912 mJ to decrypt one packet — the proposal was right that RSA is too heavy for the nodes.'),
  B(`Use the public key once, not at every CH election: authenticating every new CH with RSA/ECC cuts FND by ${Math.round((1 - SG('v8', 'center', 's2_hybrid_rsa').F / v8.F) * 100)} – ${Math.round((1 - SG('leach', 'center', 's2_hybrid_rsa').F / leach.F) * 100)} %; once per node (then symmetric credentials from the sink) costs v8 only ${Math.round((1 - SG('v8', 'center', 's6_once_rsa').F / v8.F) * 100)} %.`),
  B('RSA vs ECC on the node: with the sink doing the private-key work, RSA is slightly cheaper for the node (15.4 vs 22.3 mJ); ECC gives the same security with much smaller keys (160 vs 1024 bits).'),
  B(`v8 protects best: it re-elects CHs less often (setup every 5 rounds), so it pays fewer authentications. With the recommended hybrid: v8 ${SG('v8', 'center', 's6_once_rsa').F} vs PEGASIS ${SG('pegasis', 'center', 's6_once_rsa').F} vs LEACH ${SG('leach', 'center', 's6_once_rsa').F} — still +${C.gain(SG('v8', 'center', 's6_once_rsa').F, leach.F).toFixed(0)} % over LEACH without any security. Far BS: v8-Chain ${SG('v8chain', 'far', 's6_once_rsa').F} vs PEGASIS ${SG('pegasis', 'far', 's6_once_rsa').F} and LEACH ${SG('leach', 'far', 's6_once_rsa').F}.`),
  callout('Recommended design', ['AES + 8-byte MIC on every message; public key (RSA or ECC) once per node; the sink authenticates new CHs and gives them credentials with the symmetric key.']),

  H1('10. Limitations'),
  B('Analytical radio model for the long runs (no collisions or retransmissions); packet-level only in the small demo.'),
  B('100 static nodes with equal energy in one 100 × 100 m field; two BS positions only.'),
  B('Security is modelled as energy cost only: public-key energy from published MCU measurements [16], AES energy assumed; attacks are not simulated.'),
  B('Missing paper details (packet size, sensor signal) had to be assumed.'),

  H1('11. Conclusion'),
  B('The reproduced protocols match their papers; in a fair environment LEACH has the best first death of the classic protocols.'),
  B('The three hybrids fail because they break LEACH\'s rotation; one-line fixes restore them.'),
  B(`v8 is the main protocol: the latest first node death of all with the BS at the centre (FND ${v8.F}, PDR ${pct(v8.P)}).`),
  B(`v8-Chain is v8 plus an energy-aware relay, used when the BS is far: FND ${v8cf.F}, the best of all protocols in that case.`),
  B(`The hybrid cryptography of the proposal (AES + public key once) costs v8 ${Math.round((1 - SG('v8', 'center', 's6_once_rsa').F / v8.F) * 100)} % of lifetime; full RSA breaks every protocol.`),

  H1('References'),
  ...C.REFS.map((r, i) => P(`[${i + 1}]  ${r}`, { spacing: { after: 100 } })),
];

save(doc('State-of-the-Art Report — v8 / v8-Chain', body, { headerText: 'State-of-the-Art Report · Energy-efficient clustering in WSNs' }),
  path.join(__dirname, '..', 'SOTA_Report_v8-Chain.docx'));
