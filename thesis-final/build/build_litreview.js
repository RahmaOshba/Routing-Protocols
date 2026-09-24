// Literature review of the papers used in the thesis
// Run: NODE_PATH=<node_modules> node build_litreview.js
const path = require('path');
const C = require('./common.js');
const { P, H1, H2, H3, B, eq, table, callout, spacer, pageBreak, doc, titlePage, save, TEXT_W } = require('./docx_lib.js');
const g = C.get, pct = C.pct;
const b = t => ({ text: t, bold: true });

// one structured entry per paper
function paper(p) {
  const out = [H2(p.title)];
  out.push(table(['', ''], [['Reference', p.ref], ['Venue', p.venue], ['Link', p.link], ['Code in this thesis', p.code || '— (reviewed, not re-implemented)']],
    [2200, TEXT_W - 2200], { size: 18 }));
  out.push(spacer());
  out.push(H3('Problem addressed'), P(p.problem));
  out.push(H3('Method'));
  p.method.forEach(m => out.push(typeof m === 'string' && m.startsWith('EQ:') ? eq(m.slice(3)) : P(m)));
  out.push(H3('Evaluation and reported results'));
  p.results.forEach(r => out.push(B(r)));
  out.push(H3('Strengths'));
  p.strengths.forEach(r => out.push(B(r)));
  out.push(H3('Limitations'));
  p.limits.forEach(r => out.push(B(r)));
  if (p.ours) { out.push(H3('What our reproduction showed')); p.ours.forEach(r => out.push(B(r))); }
  out.push(H3('Relevance to this thesis'), P(p.relevance));
  return out;
}
const O = r => `FND ${g(r).F} / HND ${g(r).H} / LND ${g(r).L}, PDR ${pct(g(r).P)}`;

const PAPERS = {
  classic: [
    { title: '1. LEACH — Low-Energy Adaptive Clustering Hierarchy (2000)', ref: `[1] ${C.REFS[0]}`, venue: 'Proc. HICSS-33 (IEEE), 2000', link: 'https://doi.org/10.1109/HICSS.2000.926982', code: 'code/1_ORIGINAL/leach_ORIGINAL.cc, code/2_EDITED/leach_EDITED.cc',
      problem: 'Direct transmission to a far BS drains the farthest nodes first, and minimum-transmission-energy multi-hop routing drains the nodes near the BS. Static clustering drains the fixed cluster heads.',
      method: ['Nodes organise themselves into clusters every round. A node n that has not been CH in the last 1/P rounds (set G) becomes CH if a random number in [0,1) is below',
        'EQ:T(n) = P / (1 − P · (r mod 1/P))   if n ∈ G ,   otherwise 0',
        'CHs broadcast an advertisement; every node joins the CH it hears best, the CH sends a TDMA schedule, members send in their slots, and the CH fuses the data and sends one packet to the BS.'],
      results: ['100 random nodes in a 50 × 50 m field, BS far from the field, first-order radio with a single amplifier term (100 pJ/bit/m²), 2000-bit packets, P = 5 %.', 'With 0.5 J per node: first node dead at round 932, last node at round 1312 (Table 2 of the paper); 8× less energy than direct transmission.'],
      strengths: ['Fully distributed, no global knowledge.', 'Rotation spreads the CH load; local fusion cuts long-range traffic.'],
      limits: ['CH election ignores residual energy: a weak node can be elected and die.', 'The number and position of CHs vary randomly; a round can even have no CH.', 'Every CH sends directly to the BS.'],
      ours: [`Paper settings: ${O('leach_ORIGINAL')} (published LND 1312).`, `Unified environment: ${O('leach_EDITED')}.`],
      relevance: 'The LEACH threshold T(r), the epoch set G and the nearest-CH join are kept in the proposed protocol.' },
    { title: '2. LEACH-C — centralised LEACH (2002)', ref: `[2] ${C.REFS[1]}`, venue: 'IEEE Trans. Wireless Communications, 2002', link: 'https://doi.org/10.1109/TWC.2002.804190',
      problem: 'LEACH does not guarantee a good number or placement of CHs.',
      method: ['Each node reports its position and energy to the BS; the BS chooses the CHs (simulated annealing) among nodes with at least the average energy. The paper also formalises the first-order radio model with the two amplifier terms ε_fs·d² and ε_mp·d⁴.'],
      results: ['Better CH placement and longer lifetime than LEACH in the authors\' simulations.'],
      strengths: ['Optimal-quality clusters; defines the radio model used by almost every later paper.'],
      limits: ['Needs global knowledge (GPS or localisation) and a round-trip to the BS every round.'],
      relevance: 'Source of the two-slope radio model of the unified environment; its "only nodes with at least the average energy" rule inspired the energy gate I5.' },
    { title: '3. HEED — Hybrid Energy-Efficient Distributed clustering (2004)', ref: `[3] ${C.REFS[2]}`, venue: 'IEEE Trans. Mobile Computing, 3(4), 2004', link: 'https://doi.org/10.1109/TMC.2004.41', code: 'code/1_ORIGINAL/heed_ORIGINAL.cc, code/2_EDITED/heed_EDITED.cc, heed_fairness_EDITED.cc',
      problem: 'Distributed clustering that is energy-aware, terminates in a fixed number of iterations and produces well-distributed CHs, independent of node positions.',
      method: ['Each node starts with', 'EQ:CH_prob = max( C_prob · E_res / E_max , p_min )',
        'and doubles it every iteration. A node that hears a tentative CH with lower communication cost (e.g. 1/degree) joins it; otherwise it announces itself tentative CH, and final CH when CH_prob reaches 1. The election ends after at most ⌈log₂(1/p_min)⌉ + 1 iterations.'],
      results: ['Application experiments with 300–700 nodes, sink at (50, 175), 2 J per node, 100-byte packets, 5 TDMA frames per round.', 'Longer lifetime than generalised LEACH; results given as graphs only.'],
      strengths: ['Energy-aware, fully distributed, provable termination, good CH spread.'],
      limits: ['The iterative negotiation is paid every clustering round.', 'Many CHs when energy is low (C_prob · E_res/E_max is small but doubling still forces a CH).'],
      ours: [`Paper settings (500 nodes): ${O('heed_ORIGINAL')}.`, `Unified environment: ${O('heed_EDITED')} — the earliest first-node death of all protocols, caused by the negotiation overhead.`],
      relevance: 'The proposed protocol keeps HEED\'s intelligence (energy × connectivity) but computes it in a single pass, without negotiation.' },
    { title: '4. PEGASIS — Power-Efficient Gathering in Sensor Information Systems (2002)', ref: `[4] ${C.REFS[3]}`, venue: 'Proc. IEEE Aerospace Conference, 2002', link: 'https://doi.org/10.1109/AERO.2002.1035242', code: 'code/1_ORIGINAL/pegasis_ORIGINAL.cc, code/2_EDITED/pegasis_EDITED.cc',
      problem: 'Reduce LEACH\'s CH overhead further.',
      method: ['A greedy chain is built starting from the node farthest from the BS. Data is passed and fused along the chain towards a leader; the leader of round i is node i mod N, and only the leader transmits to the BS. The chain is rebuilt when a node dies.'],
      results: ['50 × 50 m and 100 × 100 m fields, BS at (25, 150); with 0.5 J per node FND/HND/LND = 1578 / 2082 / 2192 rounds (Table 1, 50 × 50 m).'],
      strengths: ['Very short hops and a single long transmission per round.'],
      limits: ['Long chain → large delay; the leader is a single point of failure; long chain links appear as nodes die.'],
      ours: [`Paper settings: ${O('pegasis_ORIGINAL')} (LND within 0.3 % of the paper).`, `Unified environment: ${O('pegasis_EDITED')} — the longest LND, but the first node dies at round ${g('pegasis_EDITED').F}.`],
      relevance: 'Motivates relaying between CHs; v6/v7 test ordered chains and v8-Chain relays only when it saves energy.' },
  ],
  hybrid: [
    { title: '5. SH-LEACH — Stochastic cluster-head selection LEACH (2015)', ref: `[5] ${C.REFS[4]}`, venue: 'IJIBC 7(1):30–35, 2015', link: 'https://doi.org/10.7236/IJIBC.2015.7.1.30', code: 'code/1_ORIGINAL/shleach_ORIGINAL.cc, 2_EDITED/shleach_EDITED.cc, 3_IMPROVED/shleach_IMPROVED.cc',
      problem: 'LEACH ignores energy; HEED\'s probability shrinks when energy is low. The paper combines them.',
      method: ['LEACH-style draw with a new probability (Eq. 3 of the paper):', 'EQ:CH_prob = C_prob · (E_res/E_max) · (C_prob · r) / (1 + CH_cho mod (1/C_prob))',
        'where r is the round number and CH_cho the number of CHs chosen so far.'],
      results: ['100 nodes, 100 × 100 m, C_prob = 0.10, 0.5 J, 2000 rounds; results as graphs only (later first-node death than LEACH).'],
      strengths: ['Simple energy-aware extension of LEACH.'],
      limits: ['r is never reset, so the probability keeps growing: about 29 CHs per round in our run (the paper itself admits the CH count is not guaranteed).', 'The probability is 0 in round 0; BS position and packet size are not given.'],
      ours: [`Paper settings: ${O('shleach_ORIGINAL')}.`, `Unified: ${O('shleach_EDITED')}.`, `Improved (r → r mod 1/C_prob): ${O('shleach_IMPROVED')} — the best reproduced protocol.`],
      relevance: 'Shows that an energy term alone is not enough: the rotation (epoch) structure must be kept.' },
    { title: '6. H-LEACH — Hybrid LEACH (2016)', ref: `[6] ${C.REFS[5]}`, venue: 'Proc. IEEE LISAT, 2016', link: 'IEEE Xplore (search the title)', code: 'code/1_ORIGINAL/hleach_ORIGINAL.cc, 2_EDITED/hleach_EDITED.cc, 3_IMPROVED/hleach_IMPROVED.cc',
      problem: 'LEACH may elect weak nodes, causing energy holes.',
      method: ['Algorithm 1 of the paper:', 'EQ:e0(i) = P · E_res,i / E_max ,    t(n) = e0 / (1 − e0 · (r mod round(1/e0)))',
        'A node becomes CH if rand < t(n) AND its energy is above the average energy of the nodes.'],
      results: ['100 nodes, 100 × 100 m, sink at the centre, P = 0.1, 0.5 J, 4000-bit packets; last node dead at ≈ 4312 rounds vs 1778 for LEACH.'],
      strengths: ['Energy gate prevents weak CHs.'],
      limits: ['With equal starting energy no node is strictly above the average → no CH is ever elected (deadlock).', 'Energy is subtracted as a constant per round instead of a radio model, which explains the 4312.', 'No G set; the reported 4312 exceeds the stated 4000-round limit.'],
      ours: [`Paper settings (with a fallback CH): ${O('hleach_ORIGINAL')}.`, `Unified: ${O('hleach_EDITED')}.`, `Improved (≥ average + LEACH G-set): ${O('hleach_IMPROVED')}.`],
      relevance: 'The energy gate, written with ≥ and paired with the epoch fix I1, is mechanism I5 of the proposed protocol.' },
  ],
  recent: [
    { title: '7. EECH-HEED — adaptive dual-zone hybrid clustering (2025)', ref: `[7] ${C.REFS[6]}`, venue: 'Scientific Reports 15, 35548, 2025 (open access)', link: 'https://doi.org/10.1038/s41598-025-19480-y', code: 'code/1_ORIGINAL/eechheed_ORIGINAL.cc, 2_EDITED/eechheed_EDITED.cc, 3_IMPROVED/eechheed_IMPROVED.cc',
      problem: 'Soil-monitoring WSNs with heterogeneous energy; static thresholds and single-zone clustering waste energy.',
      method: ['Zone 1 (30 nodes within 30 m of the BS, HEED): P = C_prob · E_res / E_avg.  Zone 2 (70 heterogeneous nodes, EECH): P = (E/E_max) · (D/D_max) with D = node degree.',
        'EQ:T_i(r) = P / (1 − P · (r mod 1/P)) · α_i · β_i ,   α_i = E_res/E_init ,   β_i = 1 − d_i/d_max',
        'Zone-2 primary CHs relay through secondary CHs or Zone-1 CHs. Adaptive sensing: HT = HT0 + λ·dS/dt, ST = ST0 + μ(1 − E/E0); a node reports only when both thresholds are exceeded.'],
      results: ['MATLAB, 100 nodes, 100 × 100 m, BS at the centre, 4000-bit packets, E_DA = 50 nJ/bit, C_prob = 0.05, 20 runs.', 'Table 7: FND 1250, HND 1650, LND 2200, PDR 95 %; the paper also shows HCRT with FND 3098 and LND 10004.'],
      strengths: ['Zone-aware election, multi-hop for far nodes, energy- and proximity-aware threshold.'],
      limits: ['Eq. 5 gives P ≈ 1 in zone 2, so the 1/P rotation no longer excludes anyone.', 'Part of the lifetime gain comes from sending less (sensing), not from clustering; the sensed signal is not specified.', 'Inconsistencies: 10 % CHs in the text vs C_prob = 0.05 in Table 5; aggregation 50 nJ/bit (10× the usual value).'],
      ours: [`Paper scenario (sensing on, 56 J): ${O('eechheed_ORIGINAL')}.`, `Unified (sensing off): ${O('eechheed_EDITED')}; improved (zone-2 rotation at 10 %): ${O('eechheed_IMPROVED')}.`],
      relevance: 'Closest recent hybrid; its zone-2 score (energy × degree) is close to the single-pass score of the proposed protocol.' },
    { title: '8. RL-ILEACH — reinforcement-learning enhanced improved LEACH (2026)', ref: `[8] ${C.REFS[7]}`, venue: 'Scientific Reports, 2026 (open access)', link: 'https://doi.org/10.1038/s41598-026-65225-w',
      problem: 'LEACH and ILEACH choose CHs without adapting to the current energy, density and distance.',
      method: ['A tabular Q-learning agent inside ILEACH learns which nodes should become CH, using residual energy, node density and communication distance as the state; the reward favours energy-balanced choices.'],
      results: ['MATLAB, 200 and 500 nodes; compared with LEACH, ILEACH, RL-LEACH and NNMH-LEACH.', 'Reported lifetime gains of 784 % over LEACH and 130 % over ILEACH (abstract; the contribution list gives 789 %, 196 % and 100 %).', 'Table 3 (200 nodes): FND — LEACH 156, ILEACH 936, RL-ILEACH 524.'],
      strengths: ['Adaptive and lightweight compared with deep RL.'],
      limits: ['Its first node dies earlier than ILEACH\'s (524 vs 936 rounds) — the gain is in the later rounds.', 'Learning and state-exchange overhead on the nodes is not quantified; the percentages differ between abstract and contributions.'],
      relevance: 'Shows the trend towards learning-based CH election; the proposed protocol reaches a later first-node death with a closed-form score.' },
    { title: '9. DL-HEED — deep-learning HEED for heterogeneous WSNs (2025)', ref: `[9] ${C.REFS[8]}`, venue: 'Applied Sciences 15(16), 8996, 2025 (open access)', link: 'https://doi.org/10.3390/app15168996',
      problem: 'HEED\'s simple heuristics do not capture the spatial and temporal patterns of energy and topology.',
      method: ['A graph neural network uses residual energy, node degree, position and signal strength of each node and its neighbours to choose CHs inside the HEED framework.'],
      results: ['Up to 60 % longer network lifetime than HEED, growing with network size (heterogeneous networks).'],
      strengths: ['Uses the graph structure of the network; handles heterogeneous energy.'],
      limits: ['Needs training data and a trained model; inference cost on sensor nodes (or a central unit) is significant.', 'Compared mainly with HEED variants.'],
      relevance: 'Shows that energy + degree are the features that matter; the proposed protocol uses exactly these two in a single formula.' },
    { title: '10. TLC — two-level clustering for randomly deployed WSNs (2024)', ref: `[10] ${C.REFS[9]}`, venue: 'Telecom 5(3), 27, 2024 (open access)', link: 'https://doi.org/10.3390/telecom5030027',
      problem: 'LEACH\'s boundary problem: nodes at cluster borders and far CHs waste energy.',
      method: ['CH selection in two levels based on LEACH, with a distance threshold at the first level to improve node → CH and CH → BS communication.'],
      results: ['Longer system lifetime than LEACH-based state-of-the-art methods in the authors\' simulations.'],
      strengths: ['Simple, keeps LEACH\'s distributed nature.'],
      limits: ['Tied to the deployment geometry; no CH failure recovery.'],
      relevance: 'Another LEACH extension that targets CH placement rather than CH protection.' },
  ],
};

const body = [
  ...titlePage('Literature Review', 'Clustering protocols for energy-efficient wireless sensor networks — the papers behind the thesis',
    ['Eng. Rahma Khaled Oshba', 'Master\'s thesis: Energy-Efficient Secure Clustering in Wireless Sensor Networks Using Hybrid Cryptography'],
    ['1. Scope and method', '2. Classic protocols', '3. LEACH + HEED hybrids', '4. Recent work (2024 – 2026)', '5. Related directions', '6. Synthesis', 'References']),

  H1('1. Scope and method'),
  P('This review covers the ten papers that the thesis builds on, grouped as classic protocols, LEACH + HEED hybrids and recent work. For each paper it gives the problem, the method with its main equations, the evaluation setting and reported results, strengths, limitations, and — where the protocol was re-implemented — what our ns-3.41 reproduction showed. Four further papers on fault tolerance, CH rotation and unequal clustering are summarised in Section 5.'),
  B('Papers 1–7 were re-implemented (LEACH-C only through its radio model); papers 8–10 were studied from the text.'),
  B('"Paper settings" results use each paper\'s own field, radio model, BS and packet size; "unified" results use the common environment of the thesis (100 nodes, 100 × 100 m, 0.5 J, BS at the centre, two-slope radio, 2000-bit packets).'),

  H1('2. Classic protocols'),
  ...PAPERS.classic.flatMap(paper),
  H1('3. LEACH + HEED hybrids'),
  ...PAPERS.hybrid.flatMap(paper),
  H1('4. Recent work (2024 – 2026)'),
  ...PAPERS.recent.flatMap(paper),

  H1('5. Related directions'),
  B([b(`FTEC [11] — `), 'fault-tolerant, energy-efficient clustering: backup mechanisms keep clusters working when a CH fails. Inspired the backup CH and cluster repair (v5).']),
  B([b(`Pachlor et al. [12] — `), 'review of CH-rotation approaches: time-driven vs energy-driven rotation and their overhead. Supports cluster reuse with energy-triggered handover (I2).']),
  B([b(`EEUC [13] — `), 'unequal clustering: smaller clusters near the BS so that relaying CHs keep energy for forwarding.']),
  B([b(`Chauhan and Soni [14] — `), 'unequal clustering with multi-hop routing through low-degree relay nodes. Supports relaying only through CHs that can afford it (energy-aware relay).']),

  H1('6. Synthesis'),
  H2('6.1 Summary table'),
  table(['Paper', 'Year', 'Election', 'Evaluation', 'Reported result', 'Main limitation'], [
    ['LEACH [1]', '2000', 'random T(n)', 'simulation, 100 nodes', 'LND 1312', 'energy-blind'],
    ['LEACH-C [2]', '2002', 'central (BS)', 'simulation', 'better CH placement', 'global knowledge'],
    ['HEED [3]', '2004', 'iterative E_res + cost', 'simulation, 300–700 nodes', 'graphs', 'negotiation overhead'],
    ['PEGASIS [4]', '2002', 'chain leader', 'simulation', 'LND 2192', 'delay, single leader'],
    ['SH-LEACH [5]', '2015', 'LEACH × energy × r', 'MATLAB, 100 nodes', 'graphs', 'CH count grows'],
    ['H-LEACH [6]', '2016', 'LEACH + E > E_avg', 'MATLAB, 100 nodes', 'LND ≈ 4312', 'deadlock, constant energy'],
    ['EECH-HEED [7]', '2025', 'zones, T·α·β', 'MATLAB, 100 nodes', 'FND 1250, LND 2200', 'rotation collapse'],
    ['RL-ILEACH [8]', '2026', 'Q-learning', 'MATLAB, 200/500 nodes', '+784 % vs LEACH', 'earlier FND than ILEACH'],
    ['DL-HEED [9]', '2025', 'graph neural network', 'simulation', '+60 % vs HEED', 'training / inference cost'],
    ['TLC [10]', '2024', 'two-level LEACH', 'simulation', 'longer lifetime', 'geometry-dependent'],
  ], [1400, 700, 1850, 1900, 1750, 2038], { size: 16 }),
  H2('6.2 Our reproduction in one environment'),
  table(['Protocol', 'FND', 'HND', 'LND', 'PDR'], C.FAMILY.map(([n, r]) => [n, g(r).F, g(r).H, g(r).L, pct(g(r).P)]),
    [3638, 1500, 1500, 1500, 1500], { center: j => j > 0, hl: i => i === 6 }),
  spacer(),
  H2('6.3 Observations'),
  B('Energy awareness alone (SH-LEACH, H-LEACH) does not help unless the rotation structure is kept — both papers break LEACH\'s epoch logic.'),
  B('HEED-style negotiation is expensive when it is paid every round; single-pass scoring plus cluster reuse removes most of that cost.'),
  B('Learning-based election (RL-ILEACH, DL-HEED) adapts well but adds training or inference cost and does not always delay the first node death.'),
  B('No reviewed paper protects the CH before and after it fails while also relaying between CHs only when it saves energy — the gap addressed by v8-Chain.'),
  B('Published numbers are not comparable across papers (different fields, radios, BS positions, packet sizes and energy models); a unified re-implementation is necessary.'),
  callout('Research gap', ['A lightweight, distributed LEACH + HEED hybrid that (1) elects CHs in a single pass using energy and connectivity, (2) reuses clusters to cut setup overhead, (3) protects the CH role before and after failure, and (4) relays between CHs only when it saves energy — evaluated against all the reviewed protocols under identical conditions.']),

  H1('References'),
  ...C.REFS.map((r, i) => P(`[${i + 1}]  ${r}`, { spacing: { after: 100 } })),
];

save(doc('Literature Review — clustering protocols for WSNs', body, { headerText: 'Literature Review · Clustering protocols for WSNs' }),
  path.join(__dirname, '..', 'Literature_Review.docx'));
