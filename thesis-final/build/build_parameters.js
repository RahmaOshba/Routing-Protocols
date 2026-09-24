// Guide to the simulation parameters of the unified environment
// Run: NODE_PATH=<node_modules> node build_parameters.js
const path = require('path');
const { P, H1, H2, H3, B, N, eq, table, callout, spacer, pageBreak, doc, titlePage, save, TEXT_W } = require('./docx_lib.js');
const b = t => ({ text: t, bold: true });

const body = [
  ...titlePage('Simulation Parameters Guide', 'What each parameter of the unified environment means, what it does, why it matters and why this value was chosen',
    ['Thesis: Energy-Efficient Secure Clustering in WSNs Using Hybrid Cryptography', 'Eng. Rahma Khaled Oshba', 'ns-3.41 analytical simulations — code in code/2_EDITED, code/3_IMPROVED, code/4_PROPOSED'],
    ['1. Network parameters', '2. Radio energy model', '2.1 Worked example', '3. Packets and data aggregation', '4. Clustering (election) parameters',
     '5. Timing parameters', '6. Performance metrics', '7. How the parameters combine: a quick energy budget', '7.1 Example: why HEED has the earliest FND',
     '8. Why these values', '8.1 Anticipated questions']),

  H1('1. Network parameters'),
  P('These parameters define the deployment: how many sensors there are, where they are and how much energy each one has.'),
  table(['Parameter', 'Value', 'Meaning', 'Why it matters'], [
    ['N', '100', 'Number of sensor nodes', 'More nodes means more contention and control messages; fewer nodes means longer distances between them'],
    ['AREA', '100 × 100 m', 'Size of the sensing field', 'Sets the distances between nodes, and transmission energy depends on distance'],
    ['BS', '(50, 50)', 'Position of the base station (sink)', 'A distant BS makes every CH-to-BS transmission expensive; a far BS (50, −100) is also tested'],
    ['E0', '0.5 J', 'Initial energy of every node', 'A node dies when it is spent; it sets how many rounds the network can last'],
    ['SEED', '12345', 'Random seed for node positions and random draws', 'The same seed gives every protocol the same topology, so the comparison is fair'],
  ], [1300, 1300, 3000, 4038]),
  spacer(),
  P('100 nodes in 10,000 m² gives about one node per 100 m², a realistic density: neither crowded nor sparse.'),

  H1('2. Radio energy model'),
  P('These are the most important parameters in the study, because they set the energy cost of every message. The model is the first-order radio model of Heinzelman et al. (LEACH-C, 2002), the standard model in WSN clustering research.'),
  table(['Parameter', 'Value', 'Meaning'], [
    ['E_elec', '50 nJ/bit', 'Energy of the transmitter/receiver electronics. Paid per bit for both sending and receiving, whatever the distance'],
    ['ε_fs', '10 pJ/bit/m²', 'Amplifier energy for short distances (free-space model), multiplied by d²'],
    ['ε_mp', '0.0013 pJ/bit/m⁴', 'Amplifier energy for long distances (multipath model), multiplied by d⁴'],
    ['d0', '87.7 m', 'Crossover distance between the two models. Not chosen: computed as √(ε_fs / ε_mp)'],
  ], [1300, 1900, 6438]),
  spacer(),
  P('With k = number of bits and d = distance:'),
  eq('E_Tx(k, d) = E_elec·k + ε_fs·k·d²      if d < d0'),
  eq('E_Tx(k, d) = E_elec·k + ε_mp·k·d⁴      if d ≥ d0'),
  eq('E_Rx(k) = E_elec·k        d0 = √(ε_fs / ε_mp) = √(10 / 0.0013) ≈ 87.7 m'),

  H2('2.1 Worked example: one 2000-bit packet'),
  table(['Distance', 'Electronics', 'Amplifier', 'Total'], [
    ['10 m (to a neighbour)', '100 µJ', '2 µJ', '102 µJ'],
    ['50 m', '100 µJ', '50 µJ', '150 µJ'],
    ['100 m (to a distant BS)', '100 µJ', '260 µJ (d⁴ regime)', '360 µJ'],
    ['Reception', '100 µJ', '—', '100 µJ'],
  ], [3000, 2200, 2238, 2200], { center: j => j > 0 }),
  spacer(),
  callout('Two lessons', [
    [b('Short range: the electronics dominate. '), 'Receiving is not free — it costs about as much as sending to a neighbour. This is why protocols with many control messages (such as HEED, where each broadcast is heard by about 20 neighbours) spend so much energy.'],
    [b('Beyond d0 the cost explodes (d⁴). '), 'Only a few messages (those of the CHs) should travel far. In PEGASIS (unified run) the first node to die, node 73, sat on a 91.5 m chain link — above d0 — while the average link was 8.4 m.'],
  ]),

  H1('3. Packets and data aggregation'),
  table(['Parameter', 'Value', 'Meaning', 'Why it matters'], [
    ['PACKET_BITS', '2000 bit', 'Size of a data packet (one sensor reading)', 'Energy scales with the number of bits'],
    ['CONTROL_BITS', '200 bit', 'Size of a control packet (advertisement, join, TDMA schedule, cost)', '10× smaller than data, but significant when there are many of them'],
    ['E_DA', '5 nJ/bit/signal', 'Energy to fuse one signal at the CH (data aggregation)', 'Very cheap compared with transmission, so aggregation saves energy'],
  ], [1600, 1500, 3300, 3238]),
  spacer(),
  H3('Why aggregation matters — a CH with 20 members and a distant BS'),
  table(['Method', 'Calculation', 'Energy'], [
    ['No aggregation', '20 packets × 360 µJ', '7.2 mJ'],
    ['With aggregation', '21 × 2000 × 5 nJ (fusion) + one packet 360 µJ', '≈ 0.57 mJ'],
  ], [2200, 5000, 2438]),
  spacer(),
  P('Aggregation saves more than 12×. The CH fuses its members’ signals plus its own (members + 1), because the CH also has a reading.'),

  H1('4. Clustering (election) parameters'),
  table(['Parameter', 'Value', 'Protocol', 'Meaning'], [
    ['P', '0.05', 'LEACH', 'Desired fraction of CHs: 5% ≈ 5 CHs out of 100 nodes'],
    ['Epoch', '20', 'LEACH', '= 1/P: within every 20 rounds each node serves as CH exactly once'],
    ['Cprob', '0.20', 'HEED', 'Initial CH probability before doubling (only sets the number of iterations)'],
    ['p_min', '0.05', 'HEED', 'Lower bound on the probability, so the number of iterations stays bounded'],
    ['RANGE', '25 m', 'HEED', 'Cluster range: the maximum member-to-CH distance'],
    ['ADV_RANGE', '141 m', 'All protocols', 'CH advertisement range = field diagonal (√2 × 100), so every node hears it'],
    ['Reuse interval', '5', 'v3 – v8', 'Clusters are reused for 5 rounds before a new election, saving setup energy'],
  ], [1600, 900, 1500, 5638]),

  H1('5. Timing parameters'),
  P('These parameters do not affect energy; they are used for delay and throughput only.'),
  table(['Parameter', 'Value', 'Meaning'], [
    ['DATA_RATE', '250 kbps', 'Bit rate of IEEE 802.15.4 (as in the lr-wpan demo); used for delay and throughput'],
    ['LIGHT', '3 × 10⁸ m/s', 'Propagation speed, for propagation delay (negligible at these distances)'],
    ['MAX_ROUNDS', '20000', 'Safety limit; every run stops when the last node dies, long before this'],
    ['FRAMES_PER_ROUND', '1', 'Each node sends one data packet per round (the HEED paper used 5)'],
  ], [2200, 1600, 5838]),

  H1('6. Performance metrics'),
  table(['Metric', 'Definition', 'Why it matters'], [
    ['FND', 'First Node Dies: round in which the first node dies', 'Main metric: the stability period, while the whole field is still covered'],
    ['HND', 'Half Nodes Die: round in which half the nodes have died', 'Average network lifetime'],
    ['LND', 'Last Node Dies: round in which the last node dies', 'Total lifetime; by then the field is no longer covered'],
    ['PDR', 'Packet Delivery Ratio: delivered ÷ generated readings', 'Reliability: does the data reach the BS?'],
  ], [1100, 4200, 4338]),
  spacer(),
  callout('Why FND matters more than LND', ['PEGASIS (unified) has LND 3504, but this only means that a few nodes near the BS survive for a long time — the field is no longer covered. FND measures how long every part of the field is monitored, which is what the application needs.']),

  H1('7. How the parameters combine: a quick energy budget'),
  N('A member node sending one packet to a CH about 15 m away spends about 0.1 mJ per round (plus small control messages).'),
  N('It starts with 0.5 J = 500 mJ.'),
  N('As a member only, it would last about 500 / 0.1 ≈ 5000 rounds.'),
  N('As a CH with 20 members it pays reception from every member, aggregation and the transmission to the BS: about 2.6 mJ per round, roughly 26× a member.'),
  callout('Conclusion', ['The CH role is what drains a node. Every clustering protocol competes on one question: how to rotate the CH role fairly and make it cheaper. FND measures exactly that.']),

  H2('7.1 Example: why HEED has the earliest FND (634)'),
  P('First round of the unified runs (from results/2_EDITED/*/results.csv):'),
  table(['First round', 'LEACH', 'HEED'], [
    ['Number of CHs', '5', '11 – 13'],
    ['Control messages sent', '105', '245'],
    ['Control messages received', '782', '2192'],
    ['Energy used in the round', '32.6 mJ', '45.4 mJ'],
  ], [3638, 3000, 3000], { center: j => j > 0 }),
  spacer(),
  B([b('CONTROL_BITS × E_elec: '), 'each reception costs 200 × 50 nJ = 10 µJ; 2192 receptions = 22 mJ, about half of the round’s energy, spent on the election.']),
  B([b('RANGE = 25 m: '), 'about 12 CHs instead of 5, so more packets travel to the BS and each CH aggregates fewer readings.']),
  B([b('FRAMES_PER_ROUND = 1: '), 'the election cost is spread over one data packet instead of five (as in the HEED paper).']),
  B([b('No rotation memory: '), 'with equal initial energy, high-degree nodes win the cost competition repeatedly. Adding a fairness penalty (HEED-fair) raises FND from 634 to 743.']),

  H1('8. Why these values'),
  P('The parameters are not invented: they are the standard settings used by most WSN clustering studies since LEACH, and the radio model is Heinzelman’s first-order model. Using common settings keeps the results comparable with the literature and fair between protocols.'),
  table(['Parameter', 'Source / reason'], [
    ['100 nodes, 100 × 100 m', 'Standard setting in LEACH and its successors; small enough to run many experiments (ablation, 8 topologies)'],
    ['E0 = 0.5 J', 'Same value as the original LEACH paper; nodes die within a reasonable number of rounds and differences are visible'],
    ['E_elec, ε_fs, ε_mp', 'First-order radio model of Heinzelman et al. (LEACH-C, 2002)'],
    ['d0 = 87.7 m', 'Computed from ε_fs and ε_mp, not chosen'],
    ['E_DA = 5 nJ/bit/signal', 'Aggregation cost from the LEACH paper'],
    ['Packet = 2000 bit', 'Message size of the original LEACH paper'],
    ['Control = 200 bit', '25-byte broadcast packet of the HEED paper'],
    ['BS at the centre (50, 50)', 'Tests the clustering itself rather than long-haul cost; a far BS (50, −100) is also evaluated'],
  ], [3000, 6638]),

  H2('8.1 Anticipated questions'),
  H3('Why is the BS at the centre?'),
  P('To test the clustering itself: with a very distant BS the result is dominated by the d⁴ cost of the long link rather than by the quality of the clustering. A far BS at (50, −100) was also tested; there the energy-aware relay of v8-Chain raises FND from 1441 (v8) to 1671.'),
  H3('Why are setup messages charged when the original papers did not charge them?'),
  P('For fairness. HEED runs several iterations of messages every round, PEGASIS sends only a token, and LEACH sends an advertisement, joins and a TDMA schedule. Ignoring these messages would favour the protocols with the heaviest overhead. A real sensor pays for every message it sends or receives.'),
  H3('What guarantees a fair comparison?'),
  B('The same parameters for every protocol.'),
  B('The same node positions (same seed; the node_positions.csv files are identical).'),
  B('The same rules: CH advertisement reaches every node, join and TDMA are charged, fusion is members + 1, a node without a CH sends directly, and every run lasts until the last node dies.'),
  B('Unchanged algorithms: each EDITED code is the ORIGINAL code, validated against its paper, with only the environment changed.'),
  H3('Would the results change with another topology?'),
  P('v8-Chain was run on 8 different topologies: FND ranged from 2471 to 2531 (mean 2500), so the result does not depend on one lucky layout.'),
  H3('Why is HEED’s Cprob set to 20%?'),
  P('Cprob does not change which nodes finally become CHs, because the probability doubles to 1 in any case; it only changes the number of iterations (4 instead of 6). The value that gives HEED the lowest overhead was chosen — any bias is in favour of the competitor.'),
  H3('Why does reception cost energy, and where does d0 come from?'),
  P('The receiver electronics must run to receive: E_elec·k. At short range this is about the same as transmitting, because E_elec (50 nJ/bit) is much larger than the amplifier term. d0 is the distance at which the free-space cost (ε_fs·d²) equals the multipath cost (ε_mp·d⁴): d0 = √(ε_fs / ε_mp) ≈ 87.7 m.'),
  spacer(),
  callout('Summary', ['The unified environment uses the standard settings of the literature, with the same topology and the same rules for every protocol. Each algorithm was first validated in its own paper’s environment, and the proposed protocol was also tested with a far BS and on 8 topologies. The results are therefore fair, comparable and stable.']),
];

save(doc('Simulation Parameters Guide', body, { headerText: 'Simulation Parameters Guide · unified environment' }),
  path.join(__dirname, '..', 'Simulation_Parameters_Guide.docx'));
