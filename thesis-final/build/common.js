// Shared data for the deck and the reports. Every number is read from
// ../../results/summary_all.csv, so the documents always match the runs.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const rows = fs.readFileSync(path.join(ROOT, 'results', 'summary_all.csv'), 'utf8').trim().split('\n').slice(1)
  .map(l => l.split(','));
const R = {};
for (const [group, run, F, H, L, P] of rows) R[run] = { group, F: +F, H: +H, L: +L, P: +P * 100 };
const get = run => { if (!R[run]) throw new Error('no result for ' + run); return R[run]; };
const pct = x => x.toFixed(2) + '%';
const gain = (a, b) => ((a / b - 1) * 100);

// robustness means
function robust(prefix) {
  const xs = Object.keys(R).filter(k => k.startsWith(prefix + '_seed')).map(k => R[k]);
  const m = f => xs.reduce((s, x) => s + x[f], 0) / xs.length;
  return { n: xs.length, F: m('F'), H: m('H'), L: m('L'), P: m('P'), Fmin: Math.min(...xs.map(x => x.F)), Fmax: Math.max(...xs.map(x => x.F)) };
}

const FAMILY = [
  ['LEACH', 'leach_EDITED', 'Baseline'], ['HEED', 'heed_EDITED', 'Baseline'], ['PEGASIS', 'pegasis_EDITED', 'Baseline'],
  ['SH-LEACH+', 'shleach_IMPROVED', 'Literature hybrid (improved)'], ['H-LEACH+', 'hleach_IMPROVED', 'Literature hybrid (improved)'],
  ['EECH-HEED+', 'eechheed_IMPROVED', 'Recent hybrid (improved)'], ['v8-Chain', 'v8_chain_center', 'Proposed'],
];
const EVOLUTION = [
  ['v1', 'v1_heed_election_leach_join', 'HEED election + LEACH nearest join'],
  ['v2', 'v2_fairness_penalty', '+ rotation-fairness penalty'],
  ['v3', 'v3_single_pass_reuse_int5', 'Single-pass score + 5-round cluster reuse'],
  ['v4', 'v4_reuse_int15', 'Reuse interval 5 → 15'],
  ['v5', 'v5_backup_int15', '+ backup CH (interval 15)'],
  ['v5-exp', 'v5x_backup_repair_int5', 'Backup + cluster repair, interval 5'],
  ['v5b', 'v5b_energy_aware_repair', '+ energy-aware backup check'],
  ['v6', 'v6_chain_center', 'Ordered CH-to-CH chain'],
  ['v7', 'v7_chain_backup_center', 'Chain + backup + chain repair'],
  ['v7.1', 'v7_1_multihop_int5', 'Greedy multihop tree'],
  ['v8', 'v8_center', 'v5b + I1–I5'],
  ['v8-Chain', 'v8_chain_center', 'v8 + energy-aware CH relay'],
];

const REFS = [
  'W. R. Heinzelman, A. Chandrakasan, H. Balakrishnan, "Energy-Efficient Communication Protocol for Wireless Microsensor Networks," Proc. 33rd Hawaii Int. Conf. System Sciences (HICSS), 2000.',
  'W. B. Heinzelman, A. P. Chandrakasan, H. Balakrishnan, "An Application-Specific Protocol Architecture for Wireless Microsensor Networks," IEEE Trans. Wireless Communications, vol. 1, no. 4, 2002.',
  'O. Younis, S. Fahmy, "HEED: A Hybrid, Energy-Efficient, Distributed Clustering Approach for Ad Hoc Sensor Networks," IEEE Trans. Mobile Computing, vol. 3, no. 4, 2004.',
  'S. Lindsey, C. S. Raghavendra, "PEGASIS: Power-Efficient Gathering in Sensor Information Systems," Proc. IEEE Aerospace Conference, 2002.',
  'S. Shrestha, Y. M. Kim, K. Jung, J.-Y. Lee, "The Improved Energy Efficient LEACH Protocol Technology of Wireless Sensor Networks," Int. J. Internet, Broadcasting and Communication (IJIBC), vol. 7, no. 1, pp. 30–35, 2015.',
  'A. Razaque, M. Mudigulam, K. Gavini, F. Amsaad, M. Abdulgader, P. Krishna, "H-LEACH: Hybrid-Low Energy Adaptive Clustering Hierarchy for Wireless Sensor Networks," Proc. IEEE LISAT, 2016.',
  'S. Kaur, S. Kour, M. Singh, "EECH-HEED: an adaptive hybrid clustering protocol for energy efficient soil monitoring in heterogeneous wireless sensor networks," Scientific Reports, vol. 15, 35548, 2025.',
  'H. H. El-Sayed, E. M. Abd-Elgaber, S. K. Refaay, "An intelligent reinforcement learning enhanced improved LEACH protocol for prolonging wireless sensor network lifetime," Scientific Reports, 2026.',
  'A. Juwaied, L. Jackowska-Strumillo, "DL-HEED: A Deep Learning Approach to Energy-Efficient Clustering in Heterogeneous Wireless Sensor Networks," Applied Sciences, vol. 15, no. 16, 8996, 2025.',
  'S. Subedi, S. K. Acharya, J. Lee, S. Lee, "Two-Level Clustering Algorithm for Cluster Head Selection in Randomly Deployed Wireless Sensor Networks," Telecom, vol. 5, no. 3, 27, 2024.',
  'J. Jassbi, S. Moridi, "Fault Tolerance and Energy Efficient Clustering Algorithm in Wireless Sensor Networks: FTEC," Wireless Personal Communications, 2019.',
  'R. Pachlor, D. Shrimankar, K. K. Nagwanshi, M. Paliwal, "Cluster-Head Rotation Approaches in Sensor Networks: A Review," arXiv:2206.08892, 2022.',
  'C. Li, M. Ye, G. Chen, J. Wu, "An Energy-Efficient Unequal Clustering Mechanism for Wireless Sensor Networks," Proc. IEEE MASS, 2005.',
  'V. Chauhan, S. Soni, "Energy Aware Unequal Clustering Algorithm with Multi-hop Routing via Low Degree Relay Nodes for Wireless Sensor Networks," J. Ambient Intelligence and Humanized Computing, vol. 12, pp. 2469–2482, 2021.',
  'ns-3 Network Simulator, release 3.41, https://www.nsnam.org, 2024.',
  'A. S. Wander, N. Gura, H. Eberle, V. Gupta, S. C. Shantz, "Energy Analysis of Public-Key Cryptography for Wireless Sensor Networks," Proc. IEEE PerCom, 2005.',
  'IEEE Std 802.15.4-2020, "IEEE Standard for Low-Rate Wireless Networks," 2020.',
];

const ENV = [
  ['Nodes', '100, random uniform'], ['Field', '100 × 100 m'], ['Initial energy', '0.5 J per node (50 J total)'],
  ['Base station', 'centre (50, 50); far case (50, −100)'], ['Data / control packet', '2000 / 200 bits'],
  ['Radio model', 'first-order, two-slope (d² / d⁴)'], ['E_elec', '50 nJ/bit'], ['ε_fs / ε_mp', '10 pJ/bit/m² / 0.0013 pJ/bit/m⁴'],
  ['d0 = √(ε_fs/ε_mp)', '≈ 87.7 m'], ['E_DA (aggregation)', '5 nJ/bit/signal'], ['Neighbour range', '25 m'],
  ['Run length', 'until the last node dies'], ['Seed', '12345 (8 seeds for robustness)'], ['Simulator', 'ns-3.41, C++, analytical energy model'],
];

module.exports = { R, get, pct, gain, robust, FAMILY, EVOLUTION, REFS, ENV, ROOT };
