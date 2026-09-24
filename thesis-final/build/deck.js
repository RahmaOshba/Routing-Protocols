// Thesis defense deck — built from scratch with pptxgenjs.
// Run:  NODE_PATH=<node_modules> node deck.js      (numbers come from ../../results)
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const React = require('react');
const RDS = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa');
const C = require('./common.js');

const FIG = path.join(__dirname, 'fig');
const SHOTS = path.join(C.ROOT, 'figures', 'ns3_screens');
const OUT = path.join(__dirname, '..', 'Thesis_Defense_v8-Chain.pptx');

// ---------- palette & type ----------
const NAVY = '14213D', INK = '1F1F1D', MUTED = '5F5E5A', LINE = 'D9D8D2', TINT = 'F3F6FB';
const BLUE = '2A78D6', ORANGE = 'EB6834', AQUA = '1BAF7A', RED = 'E34948', GOLD = 'F2C200', GREY = '9A9A96';
const HEAD = 'Cambria', BODY = 'Calibri';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';           // 13.33 x 7.5 in
pres.title = 'Energy-Efficient Secure Clustering in WSNs';
pres.author = 'Rahma Khaled Oshba';

// ---------- icons ----------
async function icon(name, color = 'FFFFFF') {
  const svg = RDS.renderToStaticMarkup(React.createElement(fa[name], { color: '#' + color, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
}
const ICONS = {};
async function loadIcons() {
  const names = ['FaBatteryQuarter', 'FaProjectDiagram', 'FaBroadcastTower', 'FaSearch', 'FaFlask', 'FaCogs', 'FaCheckCircle',
    'FaChartBar', 'FaShieldAlt', 'FaExclamationTriangle', 'FaSyncAlt', 'FaRoute', 'FaBolt', 'FaLayerGroup', 'FaUserShield',
    'FaSitemap', 'FaBook', 'FaLightbulb', 'FaCodeBranch', 'FaLock', 'FaBalanceScale', 'FaRandom', 'FaMicrochip', 'FaClock',
    'FaHandshake', 'FaDatabase', 'FaWrench', 'FaBullseye', 'FaStream', 'FaMapMarkedAlt', 'FaFlagCheckered', 'FaRobot', 'FaThLarge', 'FaLeaf'];
  for (const n of names) ICONS[n] = await icon(n);
}

// ---------- helpers ----------
let pageNo = 0;
function base(bg = 'FFFFFF') {
  const s = pres.addSlide();
  s.background = { color: bg };
  pageNo++;
  if (bg === 'FFFFFF') s.addText(String(pageNo), { x: 12.45, y: 7.05, w: 0.5, h: 0.3, fontSize: 10, color: GREY, fontFace: BODY, align: 'right', margin: 0, isTextBox: true });
  return s;
}
function title(s, t, sub) {
  s.addText(t, { x: 0.6, y: 0.35, w: 12.1, h: 0.75, fontSize: 32, bold: true, color: NAVY, fontFace: HEAD, margin: 0, valign: 'middle', isTextBox: true });
  if (sub) s.addText(sub, { x: 0.6, y: 1.08, w: 12.1, h: 0.45, fontSize: 16, color: MUTED, fontFace: BODY, margin: 0, italic: true, isTextBox: true });
}
function circleIcon(s, name, x, y, d, color) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } });
  const p = d * 0.25;
  s.addImage({ data: ICONS[name], x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
}
function card(s, x, y, w, h, { head, body, icon, color = BLUE, fill = 'FFFFFF', size = 13, headSize = 16 }) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: LINE, width: 1 },
    shadow: { type: 'outer', color: '000000', blur: 6, offset: 2, angle: 90, opacity: 0.12 } });
  let tx = x + 0.25;
  if (icon) { circleIcon(s, icon, x + 0.25, y + 0.25, 0.62, color); tx = x + 1.05; }
  s.addText(head, { x: tx, y: y + 0.25, w: x + w - tx - 0.2, h: 0.62, fontSize: headSize, bold: true, color: INK, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
  if (body) s.addText(body, { x: x + 0.25, y: y + 1.0, w: w - 0.5, h: h - 1.15, fontSize: size, color: MUTED, fontFace: BODY, valign: 'top', margin: 0, paraSpaceAfter: 4, isTextBox: true });
}
function bullets(s, items, x, y, w, h, size = 16, color = INK) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 18 }, breakLine: i < items.length - 1 } })),
    { x, y, w, h, fontSize: size, color, fontFace: BODY, valign: 'top', margin: 0, paraSpaceAfter: 8, isTextBox: true });
}
function stat(s, x, y, w, big, label, color = BLUE) {
  s.addText(big, { x, y, w, h: 0.9, fontSize: 44, bold: true, color, fontFace: HEAD, margin: 0, isTextBox: true });
  s.addText(label, { x, y: y + 0.9, w, h: 0.6, fontSize: 13, color: MUTED, fontFace: BODY, margin: 0, valign: 'top', isTextBox: true });
}
function section(num, head, sub) {
  const s = base(NAVY);
  s.addText(num, { x: 0.8, y: 2.2, w: 3, h: 1.2, fontSize: 72, bold: true, color: BLUE, fontFace: HEAD, margin: 0, isTextBox: true });
  s.addText(head, { x: 0.8, y: 3.4, w: 11, h: 0.9, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0, isTextBox: true });
  s.addText(sub, { x: 0.8, y: 4.3, w: 11, h: 0.6, fontSize: 18, color: 'C9D4E8', fontFace: BODY, margin: 0, isTextBox: true });
  return s;
}
function img(s, file, x, y, w, h) {
  const f = path.join(FIG, file);
  const m = require('child_process').execSync(`python3 -c "from PIL import Image;im=Image.open('${f}');print(im.size[0],im.size[1])"`).toString().trim().split(' ').map(Number);
  const r = m[0] / m[1];
  let W = w, H = w / r;
  if (H > h) { H = h; W = h * r; }
  s.addImage({ path: f, x: x + (w - W) / 2, y: y + (h - H) / 2, w: W, h: H });
}
function imgAbs(s, file, x, y, w, h) {
  const m = require('child_process').execSync(`python3 -c "from PIL import Image;im=Image.open('${file}');print(im.size[0],im.size[1])"`).toString().trim().split(' ').map(Number);
  const r = m[0] / m[1];
  let W = w, H = w / r;
  if (H > h) { H = h; W = h * r; }
  s.addImage({ path: file, x: x + (w - W) / 2, y: y + (h - H) / 2, w: W, h: H });
}
const chartBase = () => ({
  catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY, catAxisLabelFontSize: 12, valAxisLabelFontSize: 11,
  catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, valGridLine: { color: 'E6E5E0', size: 0.75 }, catGridLine: { style: 'none' },
  dataLabelFontFace: BODY, dataLabelFontSize: 10, dataLabelColor: INK, legendFontFace: BODY, legendFontSize: 12,
});
function lifeChart(s, labels, runs, x, y, w, h, opts = {}) {
  const data = [['FND', 'F'], ['HND', 'H'], ['LND', 'L']].map(([n, k]) => ({ name: n, labels, values: runs.map(r => C.get(r)[k]) }));
  s.addChart(pres.charts.BAR, data, Object.assign(chartBase(), {
    x, y, w, h, barDir: 'col', barGrouping: 'clustered', barGapWidthPct: 60, chartColors: [BLUE, ORANGE, AQUA],
    showLegend: true, legendPos: 't', showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 9,
    valAxisTitle: 'Rounds', showValAxisTitle: true, valAxisTitleFontSize: 12, valAxisTitleColor: MUTED,
  }, opts));
}
function singleBar(s, labels, values, colors, x, y, w, h, opts = {}) {
  s.addChart(pres.charts.BAR, [{ name: opts.name || 'value', labels, values }], Object.assign(chartBase(), {
    x, y, w, h, barDir: 'col', chartColors: colors, showLegend: false, showValue: true, dataLabelPosition: 'outEnd',
    barGapWidthPct: 50,
  }, opts));
}

// ======================================================================
async function build() {
  await loadIcons();
  const v8c = C.get('v8_chain_center'), v8cf = C.get('v8_chain_farBS'), v8f = C.get('v8_farBS');
  const best = C.get('shleach_IMPROVED'), leach = C.get('leach_EDITED'), peg = C.get('pegasis_EDITED');

  // 1 ── Title
  {
    const s = base(NAVY);
    circleIcon(s, 'FaBroadcastTower', 0.8, 0.8, 0.9, BLUE);
    s.addText('Energy-Efficient Secure Clustering in Wireless Sensor Networks Using Hybrid Cryptography',
      { x: 0.8, y: 1.9, w: 11.5, h: 2.2, fontSize: 38, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0, valign: 'top', isTextBox: true });
    s.addText('A reproducible comparison of LEACH, HEED, PEGASIS and their hybrids — and a new clustering protocol, v8-Chain',
      { x: 0.8, y: 4.25, w: 11.5, h: 0.8, fontSize: 19, color: 'C9D4E8', fontFace: BODY, italic: true, margin: 0, isTextBox: true });
    s.addText([{ text: 'Eng. Rahma Khaled Oshba', options: { bold: true, breakLine: true } },
      { text: 'Supervised by Dr. Hesham ElZouka · Dr. Amani Saad · Dr. Khaled Saada', options: { breakLine: true } },
      { text: "Master's thesis defense" }],
    { x: 0.8, y: 5.45, w: 11.5, h: 1.3, fontSize: 16, color: 'FFFFFF', fontFace: BODY, margin: 0, paraSpaceAfter: 4, isTextBox: true });
    s.addNotes('Title. This thesis compares the classic clustering protocols and their hybrids in one fair environment and proposes v8-Chain.');
  }

  // 2 ── Agenda
  {
    const s = base(); title(s, 'Agenda');
    const items = [['01', 'Background', 'WSNs, energy and clustering', 'FaBatteryQuarter'], ['02', 'Related work', 'Classic, hybrid and recent protocols', 'FaBook'],
      ['03', 'Reproduction', 'Validate, unify, fix', 'FaFlask'], ['04', 'Proposed protocol', 'v8-Chain architecture', 'FaSitemap'],
      ['05', 'Results', 'Lifetime, PDR, ablation, robustness', 'FaChartBar'], ['06', 'Discussion', 'Limitations and future work', 'FaLightbulb']];
    items.forEach(([n, h, b, ic], i) => {
      const x = 0.6 + (i % 3) * 4.1, y = 1.7 + Math.floor(i / 3) * 2.6;
      card(s, x, y, 3.8, 2.2, { head: h, body: b, icon: ic, color: [BLUE, ORANGE, AQUA][i % 3], size: 14 });
      s.addText(n, { x: x + 2.9, y: y + 1.55, w: 0.7, h: 0.5, fontSize: 22, bold: true, color: LINE, fontFace: HEAD, align: 'right', margin: 0, isTextBox: true });
    });
  }

  // ===== 01 Background
  section('01', 'Background', 'Why energy decides the life of a sensor network');
  // 3 ── Why energy
  {
    const s = base(); title(s, 'A sensor network lives as long as its batteries', 'Nodes cannot be recharged in the field — every transmitted bit costs energy');
    img(s, 'f11_topology_center.png', 7.2, 1.55, 5.6, 5.5);
    stat(s, 0.6, 1.9, 3.2, '100', 'sensors in a 100 × 100 m field', BLUE);
    stat(s, 3.9, 1.9, 3.2, '0.5 J', 'battery per sensor', ORANGE);
    bullets(s, ['Sending one bit costs E_elec + ε·dⁿ: long links are expensive (d² → d⁴ beyond d0 ≈ 88 m).',
      'Clustering: members send a short hop to a cluster head (CH); the CH fuses the data and sends one packet to the base station (BS).',
      'The hard part: choosing and rotating CHs so that no node dies early.'], 0.6, 3.7, 6.3, 3.2, 16);
    s.addNotes('Energy is the bottleneck. Clustering shortens most links, but the CH role is expensive and must rotate.');
  }
  // 4 ── How clustering works (diagram)
  {
    const s = base(); title(s, 'How a clustered round works', 'Setup (elect + join) → data (members → CH → BS)');
    const mem = [[0.9, 2.1], [1.4, 3.4], [0.8, 4.6], [2.3, 5.2], [2.6, 1.8]];
    mem.forEach(([x, y]) => { s.addShape(pres.shapes.OVAL, { x, y, w: 0.45, h: 0.45, fill: { color: BLUE }, line: { color: 'FFFFFF', width: 1.5 } });
      s.addShape(pres.shapes.LINE, { x: x + 0.22, y: y + 0.22, w: 3.25 - x - 0.22, h: 3.65 - y - 0.22, line: { color: BLUE, width: 1.2, endArrowType: 'triangle' } }); });
    s.addShape(pres.shapes.OVAL, { x: 3.0, y: 3.4, w: 0.8, h: 0.8, fill: { color: RED }, line: { color: 'FFFFFF', width: 2 } });
    s.addText('CH', { x: 3.0, y: 3.4, w: 0.8, h: 0.8, fontSize: 14, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addShape(pres.shapes.LINE, { x: 3.8, y: 3.8, w: 2.2, h: 0, line: { color: INK, width: 2, dashType: 'dash', endArrowType: 'triangle' } });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.05, y: 3.3, w: 1.3, h: 1.0, rectRadius: 0.1, fill: { color: GOLD }, line: { color: '8A6D00', width: 1.5 } });
    s.addText('BS', { x: 6.05, y: 3.3, w: 1.3, h: 1.0, fontSize: 18, bold: true, color: INK, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText('short hops', { x: 0.6, y: 6.0, w: 2.6, h: 0.4, fontSize: 13, color: BLUE, fontFace: BODY, margin: 0, isTextBox: true });
    s.addText('one fused packet', { x: 4.0, y: 3.95, w: 2.0, h: 0.4, fontSize: 13, color: INK, fontFace: BODY, margin: 0, isTextBox: true });
    card(s, 7.9, 1.7, 4.8, 2.4, { head: 'First-order radio model', icon: 'FaBolt', color: ORANGE, size: 14,
      body: 'E_tx(k,d) = k·E_elec + k·ε_fs·d²   (d < d0)\nE_tx(k,d) = k·E_elec + k·ε_mp·d⁴   (d ≥ d0)\nE_rx(k) = k·E_elec ,   E_DA = k·5 nJ per signal' });
    card(s, 7.9, 4.35, 4.8, 2.5, { head: 'What every round costs', icon: 'FaClock', color: BLUE, size: 14,
      body: 'Setup: CH advertisement, join request, TDMA schedule.\nData: member → CH, CH fuses (members + 1), CH → BS.' });
  }
  // 5 ── Problem & objectives
  {
    const s = base(); title(s, 'Problem and objectives');
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.5, w: 12.1, h: 1.3, rectRadius: 0.1, fill: { color: TINT }, line: { color: TINT } });
    s.addText([{ text: 'Problem. ', options: { bold: true, color: NAVY } }, { text: 'Published protocols are evaluated in different fields, radios and BS positions, some hybrids do not work as written, and none protects the CH role or reuses clusters — so the first node dies early.' }],
      { x: 0.9, y: 1.6, w: 11.5, h: 1.1, fontSize: 16, color: INK, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
    const o = [['Reproduce fairly', 'Rebuild LEACH, HEED, PEGASIS, SH-LEACH, H-LEACH and EECH-HEED in one ns-3 environment.', 'FaBalanceScale', BLUE],
      ['Diagnose', 'Find why each protocol wins or loses, including flaws in the published algorithms.', 'FaSearch', ORANGE],
      ['Design', 'Evolve an original hybrid protocol one mechanism at a time (v1 → v8-Chain).', 'FaCogs', AQUA],
      ['Validate', 'FND / HND / LND / PDR, ablation, two BS positions, 8 random topologies.', 'FaCheckCircle', NAVY]];
    o.forEach(([h, b, ic, col], i) => card(s, 0.6 + i * 3.08, 3.15, 2.85, 3.7, { head: h, body: b, icon: ic, color: col, size: 14, headSize: 15 }));
  }
  // 6 ── Methodology
  {
    const s = base(); title(s, 'Methodology — four steps, one environment', 'Each step has its own folder in the repository: code/ and results/');
    const st = [['1', 'ORIGINAL', 'Each paper in its own settings — validates our code', BLUE], ['2', 'EDITED', 'Same algorithms in one unified environment', ORANGE],
      ['3', 'IMPROVED', 'Fix the main flaw of each literature hybrid', AQUA], ['4', 'PROPOSED', 'v1 → v8-Chain, one mechanism per version', NAVY]];
    st.forEach(([n, h, b, col], i) => {
      const x = 0.6 + i * 3.1;
      s.addShape(pres.shapes.OVAL, { x: x + 1.05, y: 1.8, w: 0.9, h: 0.9, fill: { color: col }, line: { color: col } });
      s.addText(n, { x: x + 1.05, y: 1.8, w: 0.9, h: 0.9, fontSize: 26, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: HEAD, margin: 0, isTextBox: true });
      if (i < 3) s.addShape(pres.shapes.LINE, { x: x + 2.1, y: 2.25, w: 2.0, h: 0, line: { color: LINE, width: 2, endArrowType: 'triangle' } });
      s.addText(h, { x, y: 2.9, w: 3.0, h: 0.5, fontSize: 18, bold: true, color: col, align: 'center', fontFace: BODY, margin: 0, isTextBox: true });
      s.addText(b, { x: x + 0.1, y: 3.4, w: 2.8, h: 1.0, fontSize: 14, color: MUTED, align: 'center', fontFace: BODY, margin: 0, valign: 'top', isTextBox: true });
    });
    card(s, 0.6, 4.75, 12.1, 2.1, { head: 'Metrics', icon: 'FaChartBar', color: BLUE, size: 15,
      body: 'FND / HND / LND — round in which the first, half and last node die (every run continues until the last node really dies).   PDR — readings delivered to the BS ÷ readings generated.   Ablation, far-BS scenario and 8 random topologies test robustness.' });
  }
  // 7 ── Tools
  {
    const s = base(); title(s, 'Tools and experimental setup');
    imgAbs(s, path.join(SHOTS, 'vm_ubuntu.png'), 0.6, 1.5, 4.0, 2.4);
    imgAbs(s, path.join(SHOTS, 'first_terminal.png'), 0.6, 4.2, 4.0, 2.7);
    s.addText('Ubuntu VM (VMware) · ns-3.41 · NetAnim · Python for charts', { x: 0.6, y: 3.9, w: 4.0, h: 0.3, fontSize: 11, color: MUTED, fontFace: BODY, margin: 0, isTextBox: true });
    const rows = [['Parameter', 'Value']].concat(C.ENV.slice(0, 11));
    s.addTable(rows.map((r, i) => r.map(c => ({ text: c, options: { bold: i === 0, color: i === 0 ? 'FFFFFF' : INK, fill: { color: i === 0 ? NAVY : (i % 2 ? 'FFFFFF' : TINT) } } }))),
      { x: 5.0, y: 1.5, w: 7.7, colW: [2.8, 4.9], fontSize: 12.5, fontFace: BODY, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.42 });
  }
  // 8 ── Demo
  {
    const s = base(); title(s, 'First experiment — a packet-level demo', 'IEEE 802.15.4 (lr-wpan) packets, CSMA/CA, ACKs and an energy model — run in ns-3.41 and shown in NetAnim');
    img(s, 'demo_layout.png', 0.6, 1.6, 12.1, 3.9);
    const d = JSON.parse(fs.readFileSync(path.join(FIG, 'demo_results.json'), 'utf8'));
    const st = [[String(d.readingsGenerated), 'readings generated in 6 rounds', BLUE], [d.pdr.toFixed(0) + '%', 'reached the sink', AQUA],
      [String(d.packetsToSink), 'packets to the sink after fusion', ORANGE], [(100 * (1 - d.packetsToSink / d.readingsGenerated)).toFixed(0) + '%', 'fewer long transmissions', NAVY]];
    st.forEach(([b, l, c], k) => stat(s, 0.6 + k * 3.1, 5.55, 2.9, b, l, c));
    s.addNotes('12 sensors in 3 clusters and a sink. Each round the strongest node that has not yet served becomes CH; members send in TDMA slots; the CH fuses and sends one packet. File: code/0_FIRST_EXPERIMENTS/demo_clustered_wsn.cc, NetAnim file demo-clustered-wsn.xml.');
  }

  // ===== 02 Related work
  section('02', 'Related work', 'Classic protocols, their hybrids and recent work (2000 – 2026)');
  // 9 ── Timeline
  {
    const s = base(); title(s, 'Twenty-five years of clustering protocols');
    const ev = [['2000', 'LEACH', 'random CH rotation [1]'], ['2002', 'PEGASIS', 'one chain [4]'], ['2004', 'HEED', 'energy + cost election [3]'],
      ['2015', 'SH-LEACH', 'energy-scaled LEACH [5]'], ['2016', 'H-LEACH', 'energy gate [6]'], ['2024', 'TLC-LEACH', 'two-level grid [10]'],
      ['2025', 'EECH-HEED / DL-HEED', 'zones · deep learning [7][9]'], ['2026', 'RL-ILEACH', 'reinforcement learning [8]']];
    s.addShape(pres.shapes.LINE, { x: 0.8, y: 3.9, w: 11.8, h: 0, line: { color: LINE, width: 3 } });
    ev.forEach(([y, n, d], i) => {
      const x = 0.75 + i * 1.57, up = i % 2 === 0;
      const col = i < 3 ? BLUE : i < 5 ? ORANGE : AQUA;
      s.addShape(pres.shapes.OVAL, { x: x + 0.47, y: 3.72, w: 0.36, h: 0.36, fill: { color: col }, line: { color: 'FFFFFF', width: 2 } });
      s.addText(y, { x, y: up ? 3.1 : 4.25, w: 1.3, h: 0.45, fontSize: 18, bold: true, color: col, align: 'center', fontFace: HEAD, margin: 0, isTextBox: true });
      s.addText([{ text: n, options: { bold: true, color: INK, breakLine: true } }, { text: d, options: { color: MUTED } }],
        { x: x - 0.15, y: up ? 1.75 : 4.8, w: 1.6, h: 1.3, fontSize: 13, align: 'center', valign: up ? 'bottom' : 'top', fontFace: BODY, margin: 0, isTextBox: true });
    });
    [['Classic', BLUE], ['LEACH + HEED hybrids', ORANGE], ['Recent', AQUA]].forEach(([t, c], i) => {
      s.addShape(pres.shapes.OVAL, { x: 0.8 + i * 3.2, y: 6.6, w: 0.22, h: 0.22, fill: { color: c }, line: { color: c } });
      s.addText(t, { x: 1.1 + i * 3.2, y: 6.5, w: 2.8, h: 0.4, fontSize: 13, color: MUTED, fontFace: BODY, margin: 0, isTextBox: true });
    });
  }
  // 10 ── Classic
  {
    const s = base(); title(s, 'The three classic protocols', 'Our reproduction in each paper\'s own settings matches the published numbers');
    const c = [['LEACH (2000) [1]', 'FaRandom', BLUE, 'Random CH rotation:\nT(n) = P / (1 − P·(r mod 1/P)), n ∈ G', 'Energy-blind: a weak node can be elected.', 'Paper LND 1312 · ours 1327'],
      ['HEED (2004) [3]', 'FaHandshake', ORANGE, 'CH_prob = C_prob · E_res / E_max, doubled each iteration; ties by communication cost.', 'Negotiation messages every round cost energy.', 'Paper: graphs only · ours 500 nodes'],
      ['PEGASIS (2002) [4]', 'FaStream', AQUA, 'One greedy chain; nodes take turns as leader and only the leader talks to the BS.', 'Long chain → large delay; single point of failure.', 'Paper LND 2192 · ours 2186']];
    c.forEach(([h, ic, col, idea, flaw, res], i) => {
      const x = 0.6 + i * 4.1;
      card(s, x, 1.75, 3.85, 5.1, { head: h, icon: ic, color: col, headSize: 16, size: 14, body: '' });
      s.addText([{ text: 'Idea', options: { bold: true, color: col, breakLine: true } }, { text: idea, options: { breakLine: true } },
        { text: ' ', options: { breakLine: true } }, { text: 'Weakness', options: { bold: true, color: RED, breakLine: true } }, { text: flaw, options: { breakLine: true } },
        { text: ' ', options: { breakLine: true } }, { text: 'Validation', options: { bold: true, color: NAVY, breakLine: true } }, { text: res }],
      { x: x + 0.25, y: 2.75, w: 3.35, h: 3.9, fontSize: 14, color: INK, fontFace: BODY, valign: 'top', margin: 0, isTextBox: true });
    });
  }
  // 11 ── Hybrids + flaws
  {
    const s = base(); title(s, 'Literature hybrids — and the flaws we found', 'Implementing each paper exactly as written revealed a problem in every one');
    const c = [['SH-LEACH (2015) [5]', 'P = C·(E/E_max)·(C·r)/(1 + CH_cho mod 1/C)', 'r is never reset → the probability keeps growing → ~29 CHs every round.'],
      ['H-LEACH (2016) [6]', 'LEACH threshold with P·E/E_max; CH only if E > E_avg', 'With equal starting energy nobody is above the average → no CH is ever elected (deadlock).'],
      ['EECH-HEED (2025) [7]', 'HEED zone near the BS + EECH zone (energy × degree) + adaptive sensing', 'Eq. 5 gives P ≈ 1 in zone 2 → the 1/P rotation stops working; lifetime gain comes partly from sending less.']];
    c.forEach(([h, idea, flaw], i) => {
      const y = 1.95 + i * 1.65;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.1, h: 1.45, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 1 } });
      s.addText(h, { x: 0.85, y: y + 0.15, w: 3.4, h: 1.2, fontSize: 17, bold: true, color: NAVY, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
      s.addText(idea, { x: 4.3, y: y + 0.15, w: 3.9, h: 1.2, fontSize: 14, color: INK, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
      circleIcon(s, 'FaExclamationTriangle', 8.35, y + 0.42, 0.62, RED);
      s.addText(flaw, { x: 9.1, y: y + 0.15, w: 3.45, h: 1.2, fontSize: 14, color: INK, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
    });
    s.addText('Idea', { x: 4.3, y: 1.6, w: 2, h: 0.3, fontSize: 12, bold: true, color: MUTED, margin: 0, isTextBox: true });
    s.addText('Flaw found', { x: 9.1, y: 1.6, w: 2, h: 0.3, fontSize: 12, bold: true, color: RED, margin: 0, isTextBox: true });
  }
  // 12 ── Recent + gap
  {
    const s = base(); title(s, 'Recent work and the research gap');
    const rows = [['Work', 'Idea', 'Limitation'],
      ['EECH-HEED 2025 [7]', 'Two zones, HEED + EECH, adaptive sensing', 'Fixed zones; no CH failure recovery'],
      ['RL-ILEACH 2026 [8]', 'Q-learning chooses CHs in ILEACH', 'Training overhead; early first-node death'],
      ['DL-HEED 2025 [9]', 'Deep network predicts good CHs', 'Central training, heavy for sensors'],
      ['TLC-LEACH 2024 [10]', 'Two-level grid clustering', 'Grid tied to the field layout'],
      ['FTEC 2019 [11]', 'Fault-tolerant clustering', 'No energy-aware relay between CHs']];
    s.addTable(rows.map((r, i) => r.map(c => ({ text: c, options: { bold: i === 0, color: i === 0 ? 'FFFFFF' : INK, fill: { color: i === 0 ? NAVY : (i % 2 ? 'FFFFFF' : TINT) } } }))),
      { x: 0.6, y: 1.4, w: 7.6, colW: [2.2, 2.9, 2.5], fontSize: 13, fontFace: BODY, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.62 });
    card(s, 8.6, 1.4, 4.1, 5.45, { head: 'The gap', icon: 'FaBullseye', color: ORANGE, size: 15,
      body: 'No protocol combines, in one lightweight distributed design:\n\n• cheap single-pass CH election\n• cluster reuse to cut setup overhead\n• protection of the CH before and after it fails\n• routing between CHs only when it saves energy\n\n— and none is compared with the others in the same environment.' });
  }

  // ===== 03 Reproduction
  section('03', 'Reproduction', 'Validate the code, then compare everything in one environment');
  // 13 ── Unified env
  {
    const s = base(); title(s, 'One unified environment for every protocol', 'Differences in the results now come only from the algorithms');
    const rows = [['Parameter', 'Value']].concat(C.ENV);
    s.addTable(rows.map((r, i) => r.map(c => ({ text: c, options: { bold: i === 0, color: i === 0 ? 'FFFFFF' : INK, fill: { color: i === 0 ? NAVY : (i % 2 ? 'FFFFFF' : TINT) } } }))),
      { x: 0.6, y: 1.6, w: 6.9, colW: [2.6, 4.3], fontSize: 12, fontFace: BODY, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.34 });
    card(s, 7.9, 1.6, 4.8, 5.25, { head: 'Same rules for everyone', icon: 'FaBalanceScale', color: BLUE, size: 14,
      body: '• CH advertisement reaches every node that may join it\n• join request + TDMA schedule charged at every setup\n• CH fuses members + its own signal\n• a node with no CH sends straight to the BS\n• every run continues until the last node dies — no "fake" LND at a round limit' });
  }
  // 14 ── Validation
  {
    const s = base(); title(s, 'Step 1 — the code reproduces the papers', 'Each protocol run in its own paper\'s field, radio, BS and packet size');
    const labels = ['LEACH LND', 'PEGASIS FND', 'PEGASIS HND', 'PEGASIS LND', 'EECH-HEED FND'];
    const pub = [1312, 1578, 2082, 2192, 1250];
    const ours = [C.get('leach_ORIGINAL').L, C.get('pegasis_ORIGINAL').F, C.get('pegasis_ORIGINAL').H, C.get('pegasis_ORIGINAL').L, C.get('eechheed_ORIGINAL').F];
    s.addChart(pres.charts.BAR, [{ name: 'Published', labels, values: pub }, { name: 'Our reproduction', labels, values: ours }], Object.assign(chartBase(), {
      x: 0.6, y: 1.6, w: 8.2, h: 5.3, barDir: 'col', barGrouping: 'clustered', chartColors: [GREY, BLUE], showLegend: true, legendPos: 't',
      showValue: true, dataLabelPosition: 'outEnd', valAxisTitle: 'Rounds', showValAxisTitle: true, valAxisTitleColor: MUTED }));
    const err = (a, b) => (Math.abs(a - b) / b * 100).toFixed(1) + '%';
    card(s, 9.1, 1.6, 3.6, 5.3, { head: 'Differences', icon: 'FaCheckCircle', color: AQUA, size: 14,
      body: `LEACH LND: ${err(ours[0], pub[0])}\nPEGASIS FND: ${err(ours[1], pub[1])}\nPEGASIS HND: ${err(ours[2], pub[2])}\nPEGASIS LND: ${err(ours[3], pub[3])}\nEECH-HEED FND: ${err(ours[4], pub[4])}\n\nHEED and SH-LEACH publish graphs only. H-LEACH's 4312 comes from a constant per-round energy, not a radio model.` });
  }
  // 15 ── Baselines unified
  {
    const s = base(); title(s, 'Step 2 — classic protocols in the unified environment');
    lifeChart(s, ['LEACH', 'HEED', 'HEED + fairness', 'PEGASIS'], ['leach_EDITED', 'heed_EDITED', 'heed_fairness_EDITED', 'pegasis_EDITED'], 0.6, 1.3, 8.2, 5.6);
    const h = C.get('heed_EDITED');
    card(s, 9.1, 1.4, 3.6, 2.6, { head: 'HEED dies first', icon: 'FaHandshake', color: ORANGE, size: 13, body: `FND ${h.F}: the iterative negotiation is paid every round.` });
    card(s, 9.1, 4.2, 3.6, 2.7, { head: 'PEGASIS lasts longest', icon: 'FaStream', color: AQUA, size: 13, body: `LND ${peg.L} (short chain hops), but its first node dies at ${peg.F}.` });
  }
  // 16 ── Hybrid fixes
  {
    const s = base(); title(s, 'Step 3 — fixing the literature hybrids', 'First node death: paper settings → unified → after our fix');
    const lab = ['SH-LEACH', 'H-LEACH', 'EECH-HEED'];
    const d = ['ORIGINAL', 'EDITED', 'IMPROVED'].map((st, i) => ({ name: ['Original', 'Edited', 'Improved'][i], labels: lab, values: ['shleach', 'hleach', 'eechheed'].map(k => C.get(`${k}_${st}`).F) }));
    s.addChart(pres.charts.BAR, d, Object.assign(chartBase(), { x: 0.6, y: 1.6, w: 6.6, h: 5.3, barDir: 'col', barGrouping: 'clustered', chartColors: ['C9C8C2', GREY, BLUE],
      showLegend: true, legendPos: 't', showValue: true, dataLabelPosition: 'outEnd', valAxisTitle: 'FND (rounds)', showValAxisTitle: true, valAxisTitleColor: MUTED }));
    const fx = [['SH-LEACH', 'r → (r mod 1/C): the probability cycles like LEACH', `FND ${C.get('shleach_EDITED').F} → ${best.F}`],
      ['H-LEACH', '"≥ average" (no deadlock) + LEACH G-set', `FND ${C.get('hleach_EDITED').F} → ${C.get('hleach_IMPROVED').F}`],
      ['EECH-HEED', 'Zone-2 rotation at the paper\'s 10 % CH target', `FND ${C.get('eechheed_EDITED').F} → ${C.get('eechheed_IMPROVED').F}`]];
    fx.forEach(([h, b, r], i) => card(s, 7.5, 1.6 + i * 1.8, 5.2, 1.6, { head: `${h}: ${r}`, body: b, icon: 'FaWrench', color: BLUE, size: 13, headSize: 14 }));
  }

  // ===== 04 Proposed
  section('04', 'Proposed protocol — v8-Chain', 'A LEACH + HEED hybrid that protects its cluster heads');
  // 17 ── Architecture
  {
    const s = base(); title(s, 'Architecture of v8-Chain', 'Setup once every 5 rounds · data every round · fault tolerance at any time');
    img(s, 'f12_architecture.png', 0.5, 1.5, 12.3, 5.5);
    s.addNotes('Setup: epoch check (I1), energy gate (I5), single-pass score, advertise and join, backup CH. Data: proactive handover (I2), direct-to-BS (I4), fusion, energy-aware relay. Fault tolerance: promote backup or orphan re-join (I3).');
  }
  // 18 ── Mechanisms grid
  {
    const s = base(); title(s, 'Six mechanisms, each tested on its own');
    const m = [['Single-pass election', 'P = T(r)·(E/E0)·(1 + deg/deg_max) — HEED\'s intelligence without its negotiation.', 'FaBolt', BLUE],
      ['Cluster reuse', 'Clusters kept for 5 rounds: setup overhead paid once per interval.', 'FaSyncAlt', BLUE],
      ['Energy gate (I5)', 'Only nodes with E ≥ network average may volunteer as CH.', 'FaBatteryQuarter', ORANGE],
      ['Backup + handover (I2)', 'A strong member is ready; a weak CH hands over before it dies.', 'FaUserShield', ORANGE],
      ['Direct-to-BS (I4)', 'A node closer to the BS than to its CH sends straight to the BS.', 'FaRoute', AQUA],
      ['Energy-aware relay', 'A CH forwards through a CH nearer the BS only if that costs less.', 'FaProjectDiagram', AQUA]];
    m.forEach(([h, b, ic, col], i) => card(s, 0.6 + (i % 3) * 4.1, 1.45 + Math.floor(i / 3) * 2.75, 3.85, 2.5, { head: h, body: b, icon: ic, color: col, size: 14, headSize: 15 }));
  }
  // 19 ── Evolution
  {
    const s = base(); title(s, 'From v1 to v8-Chain', 'First node death of every version (unified environment, BS at the centre)');
    const lab = C.EVOLUTION.map(e => e[0]);
    const vals = C.EVOLUTION.map(e => C.get(e[1]).F);
    singleBar(s, lab, vals, [BLUE], 0.6, 1.5, 8.6, 5.4, { name: 'FND', valAxisTitle: 'FND (rounds)', showValAxisTitle: true, valAxisTitleColor: MUTED });
    const v1 = C.get('v1_heed_election_leach_join'), v3 = C.get('v3_single_pass_reuse_int5'), v5b = C.get('v5b_energy_aware_repair'), v8 = C.get('v8_center');
    card(s, 9.5, 1.5, 3.2, 1.7, { head: `v1 → v3: ×${(v3.F / v1.F).toFixed(1)}`, body: 'no negotiation + cluster reuse', icon: 'FaSyncAlt', color: BLUE, size: 13, headSize: 15 });
    card(s, 9.5, 3.35, 3.2, 1.7, { head: `v5b → v8: +${C.gain(v8.F, v5b.F).toFixed(0)}%`, body: 'I1–I5 (mostly I4 and I5)', icon: 'FaBolt', color: ORANGE, size: 13, headSize: 15 });
    card(s, 9.5, 5.2, 3.2, 1.7, { head: 'v6 / v7 chains', body: 'ordered chains cost energy when the BS is central', icon: 'FaStream', color: GREY, size: 13, headSize: 15 });
  }
  // 20 ── Topology
  {
    const s = base(); title(s, 'v8-Chain in action', 'Round 50 — relays appear only where they save energy');
    img(s, 'f11_topology_center.png', 0.6, 1.5, 5.6, 5.45);
    img(s, 'f11_topology_farBS.png', 6.4, 1.5, 6.3, 5.45);
  }

  // ===== 05 Results
  section('05', 'Results', 'Unified environment, seed 12345, 8 random topologies');
  // 21 ── Lifetime
  {
    const s = base(); title(s, 'Network lifetime — best version of every family');
    lifeChart(s, C.FAMILY.map(f => f[0]), C.FAMILY.map(f => f[1]), 0.6, 1.3, 8.9, 5.6, { showValue: false });
    s.addText('Exact values: summary table (slide ' + (pageNo + 6) + ')', { x: 0.6, y: 6.9, w: 8.9, h: 0.3, fontSize: 11, color: MUTED, fontFace: BODY, italic: true, margin: 0, isTextBox: true });
    stat(s, 9.8, 1.5, 3.0, '+' + C.gain(v8c.F, best.F).toFixed(0) + '%', `FND vs the best reproduced protocol (SH-LEACH+, ${best.F})`, BLUE);
    stat(s, 9.8, 3.3, 3.0, '+' + C.gain(v8c.F, leach.F).toFixed(0) + '%', `FND vs LEACH (${leach.F})`, ORANGE);
    stat(s, 9.8, 5.1, 3.0, String(v8c.F), 'rounds before the first node dies', AQUA);
  }
  // 22 ── Alive curves
  {
    const s = base(); title(s, 'All nodes stay alive longer — then die together', 'A late, steep drop means the load is shared evenly');
    img(s, 'f3_alive_curves.png', 0.6, 1.5, 12.1, 5.45);
  }
  // 23 ── PDR
  {
    const s = base(); title(s, 'Reliability — packet delivery ratio');
    const lab = C.FAMILY.map(f => f[0]); const vals = C.FAMILY.map(f => +C.get(f[1]).P.toFixed(2));
    singleBar(s, lab, vals, [BLUE], 0.6, 1.3, 8.6, 5.6, { name: 'PDR (%)', valAxisMinVal: 98.5, valAxisMaxVal: 100, dataLabelFormatCode: '0.00' });
    card(s, 9.5, 1.5, 3.2, 5.35, { head: 'Reading', icon: 'FaCheckCircle', color: AQUA, size: 14,
      body: `v8-Chain delivers ${C.pct(v8c.P)} of all readings.\n\nHEED (${C.pct(C.get('heed_EDITED').P)}) is 0.04 pp higher, but its first node dies ${v8c.F - C.get('heed_EDITED').F} rounds earlier.\n\nAll protocols are above 99 % — lifetime is where they differ.` });
  }
  // 24 ── Ablation
  {
    const s = base(); title(s, 'Ablation — which improvement matters?', 'v8 with one mechanism switched off (compile flag -DI<k>=0)');
    const ab = [['v8 (full)', 'v8_center'], ['− I1 epoch fix', 'v8_without_I1'], ['− I2 handover', 'v8_without_I2'], ['− I3 re-join', 'v8_without_I3'], ['− I5 energy gate', 'v8_without_I5'], ['− I4 direct-to-BS', 'v8_without_I4']];
    s.addChart(pres.charts.BAR, [{ name: 'FND', labels: ab.map(a => a[0]), values: ab.map(a => C.get(a[1]).F) }], Object.assign(chartBase(), {
      x: 0.6, y: 1.6, w: 8.2, h: 5.3, barDir: 'bar', chartColors: [BLUE], showLegend: false, showValue: true, dataLabelPosition: 'outEnd', catAxisOrientation: 'maxMin',
      valAxisMinVal: 0, valAxisMaxVal: 3000 }));
    card(s, 9.1, 1.6, 3.6, 2.5, { head: 'I4 and I5 carry the gain', icon: 'FaBolt', color: ORANGE, size: 13,
      body: `Without direct-to-BS FND falls to ${C.get('v8_without_I4').F}; without the energy gate to ${C.get('v8_without_I5').F}.` });
    card(s, 9.1, 4.3, 3.6, 2.6, { head: 'I1, I2, I3 are safety nets', icon: 'FaShieldAlt', color: AQUA, size: 13,
      body: 'They change FND by less than 10 rounds but prevent zero-CH rounds and lost members.' });
  }
  // 25 ── Far BS / routing
  {
    const s = base(); title(s, 'When the BS is far away, relaying pays off', 'CH → BS routing mode of v8-Chain (compile flag -DCHAIN_MODE)');
    const lab = ['Direct (v8)', 'Ordered chain', 'Energy-aware relay'];
    for (const [i, bs, t] of [[0, 'center', 'BS at the centre (50, 50)'], [1, 'farBS', 'BS far away (50, −100)']]) {
      const x = 0.6 + i * 6.2;
      s.addText(t, { x, y: 1.55, w: 5.9, h: 0.4, fontSize: 16, bold: true, color: NAVY, fontFace: BODY, margin: 0, isTextBox: true });
      singleBar(s, lab, [0, 1, 2].map(m => C.get(`${bs}_mode${m}`).F), [i ? ORANGE : BLUE], x, 2.0, 5.9, 4.1, { name: 'FND', valAxisMinVal: 0, valAxisMaxVal: 3000 });
    }
    s.addText(`Far BS: energy-aware relay +${C.gain(v8cf.F, v8f.F).toFixed(0)}% FND over direct; at the centre it relays nothing and costs nothing.`,
      { x: 0.6, y: 6.3, w: 12.1, h: 0.5, fontSize: 15, color: INK, fontFace: BODY, margin: 0, isTextBox: true });
  }
  // 26 ── Robustness
  {
    const s = base(); title(s, 'Robust across 8 random topologies', 'Seeds 12345, 1, 7, 42, 99, 2024, 31337, 555');
    img(s, 'f7_robustness.png', 0.6, 1.5, 8.0, 5.4);
    const rb = [['v5b', C.robust('v5b_center')], ['v8-Chain', C.robust('v8_chain_center')], ['v8-Chain far', C.robust('v8_chain_farBS')]];
    const rows = [['', 'Mean FND', 'Range']].concat(rb.map(([n, r]) => [n, r.F.toFixed(0), `${r.Fmin}–${r.Fmax}`]));
    s.addTable(rows.map((r, i) => r.map(c => ({ text: c, options: { bold: i === 0, color: i === 0 ? 'FFFFFF' : INK, fill: { color: i === 0 ? NAVY : 'FFFFFF' } } }))),
      { x: 8.9, y: 1.7, w: 3.8, colW: [1.4, 1.1, 1.3], fontSize: 13, fontFace: BODY, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.5 });
    s.addText('The ranking never changes: v8-Chain\'s first node dies within a ±1.2 % band.', { x: 8.9, y: 4.0, w: 3.8, h: 1.5, fontSize: 15, color: INK, fontFace: BODY, margin: 0, isTextBox: true });
  }
  // 27 ── Summary table
  {
    const s = base(); title(s, 'Summary of the comparison', 'Unified environment, BS at the centre');
    const rows = [['Protocol', 'Family', 'FND', 'HND', 'LND', 'PDR', 'FND vs v8-Chain']];
    const extra = [['H-LEACH', 'hleach_EDITED', 'Literature hybrid'], ['SH-LEACH', 'shleach_EDITED', 'Literature hybrid'], ['EECH-HEED', 'eechheed_EDITED', 'Recent hybrid']];
    const list = [C.FAMILY[0], C.FAMILY[1], C.FAMILY[2], extra[1], C.FAMILY[3], extra[0], C.FAMILY[4], extra[2], C.FAMILY[5], C.FAMILY[6]];
    list.forEach(([n, run, fam]) => { const r = C.get(run); rows.push([n, fam, r.F, r.H, r.L, C.pct(r.P), run === 'v8_chain_center' ? '—' : '+' + C.gain(v8c.F, r.F).toFixed(0) + '%']); });
    s.addTable(rows.map((r, i) => r.map((c, j) => ({ text: String(c), options: { bold: i === 0 || i === rows.length - 1, align: j >= 2 ? 'center' : 'left',
      color: i === 0 ? 'FFFFFF' : INK, fill: { color: i === 0 ? NAVY : i === rows.length - 1 ? 'DCE9FA' : (i % 2 ? 'FFFFFF' : TINT) } } }))),
    { x: 0.6, y: 1.55, w: 12.1, colW: [2.0, 3.0, 1.2, 1.2, 1.2, 1.4, 2.1], fontSize: 13, fontFace: BODY, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: 0.45 });
  }

  // ===== 06 Discussion
  section('06', 'Discussion', 'What the results do not show yet');
  // 28 ── Limitations
  {
    const s = base(); title(s, 'Limitations');
    const L = [['Analytical energy model', 'The long runs use the first-order radio model, not a packet-level MAC/PHY: no collisions, retransmissions or fading.', 'FaMicrochip'],
      ['Static, homogeneous nodes', '100 static nodes with equal energy; no mobility or heterogeneous hardware.', 'FaMapMarkedAlt'],
      ['PEGASIS keeps a longer LND', `PEGASIS's last node lives to round ${peg.L} (v8-Chain ${v8c.L}); v8-Chain optimises the first death.`, 'FaStream'],
      ['Assumptions in the papers', 'Missing settings (e.g. SH-LEACH packet size, EECH-HEED sensor signal) had to be assumed and documented.', 'FaBook'],
      ['Security not yet evaluated', 'The hybrid-cryptography layer of the title is designed but not simulated in this study.', 'FaLock'],
      ['Simulation only', 'No hardware test-bed; results are for one field size and one node count.', 'FaFlask']];
    L.forEach(([h, b, ic], i) => card(s, 0.6 + (i % 2) * 6.15, 1.45 + Math.floor(i / 2) * 1.85, 5.95, 1.65, { head: h, body: b, icon: ic, color: i === 4 ? RED : GREY, size: 13, headSize: 15 }));
  }
  // 29 ── Future work
  {
    const s = base(); title(s, 'Future work');
    const F = [['Hybrid cryptography layer', 'Symmetric keys inside clusters, lightweight public-key between CHs and the BS; measure its energy cost on top of v8-Chain.', 'FaLock', RED],
      ['Packet-level validation', 'Run v8-Chain over lr-wpan with collisions and ACKs (the demo is the first step).', 'FaBroadcastTower', BLUE],
      ['Scale and heterogeneity', 'Sweep field size, node count, BS position and heterogeneous energy.', 'FaThLarge', ORANGE],
      ['Optimal routing', 'Compare the greedy relay rule with a minimum-energy tree.', 'FaProjectDiagram', AQUA]];
    F.forEach(([h, b, ic, col], i) => card(s, 0.6 + (i % 2) * 6.15, 1.5 + Math.floor(i / 2) * 2.7, 5.95, 2.45, { head: h, body: b, icon: ic, color: col, size: 14, headSize: 16 }));
  }
  // 30 ── Conclusion
  {
    const s = base(NAVY);
    s.addText('Conclusion', { x: 0.8, y: 0.6, w: 11, h: 0.9, fontSize: 38, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0, isTextBox: true });
    const k = [[String(v8c.F), 'rounds before the first node dies — the latest of every protocol'], ['+' + C.gain(v8c.F, best.F).toFixed(0) + '%', 'over the best reproduced protocol (SH-LEACH+)'], [C.pct(v8c.P), 'packet delivery ratio']];
    k.forEach(([b, l], i) => {
      s.addText(b, { x: 0.8 + i * 4.1, y: 2.0, w: 3.8, h: 1.1, fontSize: 50, bold: true, color: [BLUE, ORANGE, AQUA][i], fontFace: HEAD, margin: 0, isTextBox: true });
      s.addText(l, { x: 0.8 + i * 4.1, y: 3.1, w: 3.7, h: 0.9, fontSize: 15, color: 'C9D4E8', fontFace: BODY, margin: 0, valign: 'top', isTextBox: true });
    });
    bullets(s, ['Six published protocols were reproduced, validated and compared in one fair environment; flaws in three hybrids were found and fixed.',
      'v8-Chain combines single-pass election, cluster reuse, CH protection and energy-aware relaying.',
      'The gain holds across 8 random topologies and grows when the BS is far away.'], 0.8, 4.4, 11.6, 2.4, 17, 'FFFFFF');
  }
  // 31-32 ── References
  for (const part of [[0, 8], [8, 15]]) {
    const s = base(); title(s, 'References' + (part[0] ? ' (continued)' : ''));
    s.addText(C.REFS.slice(part[0], part[1]).map((r, i) => ({ text: `[${part[0] + i + 1}]  ${r}`, options: { breakLine: i < part[1] - part[0] - 1 } })),
      { x: 0.6, y: 1.4, w: 12.1, h: 5.5, fontSize: 15, color: INK, fontFace: BODY, valign: 'top', margin: 0, paraSpaceAfter: 12, isTextBox: true });
  }
  // 33 ── Thanks
  {
    const s = base(NAVY);
    circleIcon(s, 'FaLeaf', 6.17, 1.6, 1.0, AQUA);
    s.addText('Thank you', { x: 0.8, y: 2.9, w: 11.7, h: 1.2, fontSize: 48, bold: true, color: 'FFFFFF', fontFace: HEAD, align: 'center', margin: 0, isTextBox: true });
    s.addText('Questions and discussion', { x: 0.8, y: 4.1, w: 11.7, h: 0.6, fontSize: 20, color: 'C9D4E8', fontFace: BODY, align: 'center', margin: 0, isTextBox: true });
    s.addText('Code, results and papers: github.com/RahmaOshba/WSNs', { x: 0.8, y: 5.6, w: 11.7, h: 0.5, fontSize: 14, color: 'C9D4E8', fontFace: BODY, align: 'center', margin: 0, isTextBox: true });
  }

  await pres.writeFile({ fileName: OUT });
  console.log('written', OUT, pageNo, 'slides');
}
build().catch(e => { console.error(e); process.exit(1); });
