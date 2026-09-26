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
    'FaHandshake', 'FaDatabase', 'FaWrench', 'FaBullseye', 'FaStream', 'FaMapMarkedAlt', 'FaFlagCheckered', 'FaRobot', 'FaThLarge', 'FaLeaf',
    'FaSeedling', 'FaHeartbeat', 'FaIndustry', 'FaCity', 'FaTree', 'FaKey', 'FaThermometerHalf', 'FaWifi', 'FaUsers', 'FaTools', 'FaArrowRight', 'FaTrophy', 'FaBug'];
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

// ---------- extra helpers ----------
function tbl(s, rows, x, y, w, colW, o = {}) {
  const last = rows.length - 1;
  s.addTable(rows.map((r, i) => r.map((c, j) => ({ text: String(c), options: {
    bold: i === 0 || (o.hlLast && i === last) || (o.boldFirst && j === 0), align: o.center && j >= (o.centerFrom || 1) ? 'center' : 'left',
    color: i === 0 ? 'FFFFFF' : INK,
    fill: { color: i === 0 ? NAVY : (o.hlLast && i === last) ? 'DCE9FA' : (o.hl && o.hl(i)) ? 'DCE9FA' : (i % 2 ? 'FFFFFF' : TINT) } } }))),
  { x, y, w, colW, fontSize: o.size || 13, fontFace: BODY, border: { type: 'solid', color: LINE, pt: 0.5 }, rowH: o.rowH || 0.42, valign: 'middle' });
}
function note(s, t) { s.addNotes(t); }
function band(s, text, y = 6.45, color = NAVY) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.1, h: 0.62, rectRadius: 0.08, fill: { color: TINT }, line: { color: TINT } });
  s.addText(text, { x: 0.85, y, w: 11.7, h: 0.62, fontSize: 15, color, fontFace: BODY, bold: true, valign: 'middle', margin: 0, isTextBox: true });
}
function lesson(s, text, y = 6.45) { band(s, 'Lesson:  ' + text, y, NAVY); }
const F = r => C.get(r).F;
const FF = r => C.get(r + '_farBS').F;
function eqBox(s, file, x, y, w, h) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: 'F7F7F4' }, line: { color: LINE } });
  img(s, file, x + 0.15, y + 0.1, w - 0.3, h - 0.2);
}
const chg = (a, b) => (a >= b ? '+' : '−') + (Math.abs(a - b) / b * 100).toFixed(1) + '%';
const res = (n, r) => { const x = C.get(r); return [n, x.F, x.H, x.L, C.pct(x.P)]; };
function pdrChart(s, labels, runs, x, y, w, h, min = 98.5) {
  singleBar(s, labels, runs.map(r => +C.get(r).P.toFixed(2)), [AQUA], x, y, w, h, { name: 'PDR (%)', valAxisMinVal: min, valAxisMaxVal: 100, dataLabelFormatCode: '0.00',
    showTitle: true, title: 'Packet delivery ratio (%)', titleFontSize: 13, titleColor: INK, catAxisLabelFontSize: 10 });
}

// ======================================================================
async function build() {
  await loadIcons();
  const v8c = C.get('v8_chain_center'), v8cf = C.get('v8_chain_farBS'), v8f = C.get('v8_farBS'), v8m = C.get('v8_center');
  const best = C.get('shleach_IMPROVED'), leach = C.get('leach_EDITED'), heed = C.get('heed_EDITED'), peg = C.get('pegasis_EDITED');

  // 1 ── Title
  {
    const s = base(NAVY);
    circleIcon(s, 'FaBroadcastTower', 0.8, 0.8, 0.9, BLUE);
    s.addText('Energy-Efficient Secure Clustering in Wireless Sensor Networks Using Hybrid Cryptography',
      { x: 0.8, y: 1.9, w: 11.5, h: 2.2, fontSize: 38, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0, valign: 'top', isTextBox: true });
    s.addText('From LEACH, HEED and PEGASIS to a new clustering protocol: v8  (+ v8-Chain for a far base station)',
      { x: 0.8, y: 4.25, w: 11.5, h: 0.8, fontSize: 20, color: 'C9D4E8', fontFace: BODY, italic: true, margin: 0, isTextBox: true });
    s.addText([{ text: 'Eng. Rahma Khaled Oshba', options: { bold: true, breakLine: true } },
      { text: 'Supervised by Dr. Hesham ElZouka · Dr. Amani Saad · Dr. Khaled Saada', options: { breakLine: true } },
      { text: "Master's thesis" }],
    { x: 0.8, y: 5.45, w: 11.5, h: 1.3, fontSize: 16, color: 'FFFFFF', fontFace: BODY, margin: 0, paraSpaceAfter: 4, isTextBox: true });
  }
  // 2 ── Agenda
  {
    const s = base(); title(s, 'Agenda');
    const items = [['01', 'Background', 'WSNs and clustering', 'FaWifi'], ['02', 'Energy & first experiments', 'energy model, ns-3, demo', 'FaBolt'],
      ['03', 'Classic protocols', 'LEACH · HEED · PEGASIS', 'FaBook'], ['04', 'Hybrid protocols', 'SH-LEACH · H-LEACH · EECH-HEED', 'FaLayerGroup'],
      ['05', 'Recent work', 'and literature review', 'FaSearch'], ['06', 'Proposed protocol', 'v1 → v8-Chain', 'FaCogs'],
      ['07', 'Conclusion', 'limitations · summary', 'FaFlagCheckered']];
    items.forEach(([n, h, b, ic], i) => {
      const x = 0.6 + (i % 4) * 3.07, y = 1.55 + Math.floor(i / 4) * 2.7;
      card(s, x, y, 2.85, 2.4, { head: h, body: b, icon: ic, color: [BLUE, ORANGE, AQUA, NAVY][i % 4], size: 14, headSize: 15 });
      s.addText(n, { x: x + 2.0, y: y + 1.85, w: 0.7, h: 0.45, fontSize: 20, bold: true, color: LINE, fontFace: HEAD, align: 'right', margin: 0, isTextBox: true });
    });
  }

  // ================= 01 BACKGROUND =================
  section('01', 'Background', 'What a wireless sensor network is — and why energy is its main problem');
  {
    const s = base(); title(s, 'What is a Wireless Sensor Network (WSN)?', 'Many small battery-powered sensors that measure and report by radio');
    img(s, 'b1_wsn.png', 0.5, 1.55, 8.0, 3.6);
    bullets(s, ['Sensors are spread over a field (soil, forest, building, body …).', 'Each sensor measures (temperature, humidity, motion …) and sends its reading by radio.',
      'The readings reach a sink / base station (BS), then the user over the Internet.'], 8.7, 1.7, 4.1, 3.6, 15);
    const app = [['Agriculture', 'FaSeedling'], ['Environment', 'FaTree'], ['Health', 'FaHeartbeat'], ['Industry', 'FaIndustry'], ['Smart city', 'FaCity'], ['Security', 'FaShieldAlt']];
    app.forEach(([t, ic], i) => { const x = 0.7 + i * 2.05; circleIcon(s, ic, x, 5.45, 0.65, [BLUE, AQUA, RED, ORANGE, NAVY, GREY][i]);
      s.addText(t, { x: x + 0.72, y: 5.45, w: 1.3, h: 0.65, fontSize: 13, color: INK, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true }); });
    s.addText('Applications', { x: 0.7, y: 5.05, w: 3, h: 0.35, fontSize: 13, bold: true, color: MUTED, fontFace: BODY, margin: 0, isTextBox: true });
    note(s, 'A WSN is a set of small battery-powered sensors that measure something and send it by radio to a base station.');
  }
  {
    const s = base(); title(s, 'Inside a sensor node', 'Small, cheap and limited — the battery decides how long it lives');
    img(s, 'b2_node.png', 0.6, 1.5, 7.6, 2.8);
    const c = [['Limited battery', 'Usually cannot be replaced or recharged in the field.', 'FaBatteryQuarter', RED],
      ['Short radio range', 'Tens of metres; far nodes cannot reach the BS cheaply.', 'FaWifi', BLUE],
      ['Small CPU and memory', 'Heavy algorithms (and heavy cryptography) are costly.', 'FaMicrochip', ORANGE]];
    c.forEach(([h, b, ic, col], i) => card(s, 0.6 + i * 4.1, 4.55, 3.85, 1.85, { head: h, body: b, icon: ic, color: col, size: 13, headSize: 15 }));
    band(s, 'Radio communication uses most of the energy — even listening costs energy.', 6.55);
  }
  {
    const s = base(); title(s, 'The main problem: energy', 'Network lifetime = how long the sensors keep working');
    bullets(s, ['Sending one bit costs more the farther it goes: cost grows with d² and, beyond ≈ 88 m, with d⁴.',
      'If every sensor sends directly to a far BS, the far sensors die very early.',
      'When sensors die, parts of the field are no longer monitored.'], 0.6, 1.6, 6.6, 3.0, 16);
    const m = [['FND', 'First Node Dies — round of the first death (stability period). Main metric.', BLUE], ['HND', 'Half Nodes Die — average lifetime.', ORANGE],
      ['LND', 'Last Node Dies — total lifetime.', AQUA], ['PDR', 'Packet Delivery Ratio — delivered ÷ generated readings.', NAVY]];
    m.forEach(([h, b, col], i) => { const y = 1.6 + i * 1.25;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.6, y, w: 5.1, h: 1.1, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: LINE } });
      s.addText(h, { x: 7.75, y, w: 1.1, h: 1.1, fontSize: 22, bold: true, color: col, fontFace: HEAD, valign: 'middle', margin: 0, isTextBox: true });
      s.addText(b, { x: 8.9, y, w: 3.7, h: 1.1, fontSize: 13, color: INK, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true }); });
    card(s, 0.6, 4.1, 6.6, 1.65, { head: 'Solution studied in this thesis: clustering', icon: 'FaProjectDiagram', color: BLUE, size: 14, body: 'Group the sensors so that most transmissions are short.' });
  }
  {
    const s = base(); title(s, 'What is clustering?', 'Members send a short hop to a cluster head (CH); the CH sends one packet to the BS');
    img(s, 'b3_clustering.png', 0.6, 1.5, 12.1, 4.8);
    band(s, 'Cluster head (CH) = the leader of a group.  Member = a normal sensor.  Fusion = the CH merges all readings into one packet.', 6.4);
  }
  {
    const s = base(); title(s, 'One clustering round', 'Setup → steady state → the CH role rotates in the next round');
    img(s, 'b4_round.png', 0.6, 1.5, 12.1, 2.7);
    const c = [['Setup', 'Choose CHs, CHs advertise, members join the nearest CH, CH sends a TDMA schedule.', ORANGE],
      ['Steady state', 'Each member sends in its own time slot (TDMA) — no collisions.', BLUE],
      ['Fusion + BS', 'The CH fuses members + its own reading and sends one packet to the BS.', AQUA]];
    c.forEach(([h, b, col], i) => card(s, 0.6 + i * 4.1, 4.4, 3.85, 1.95, { head: h, body: b, color: col, size: 13, headSize: 16 }));
    band(s, 'Round = one full cycle.  Epoch = the rounds needed so that every node serves as CH once.', 6.5);
  }
  {
    const s = base(); title(s, 'The open problems of clustering', 'What every protocol in this thesis tries to solve');
    const p = [['Who becomes CH?', 'A weak or badly placed CH dies early.', 'FaUsers', BLUE], ['Fair rotation', 'The CH works harder, so the role must rotate.', 'FaSyncAlt', BLUE],
      ['Setup overhead', 'Electing CHs every round costs messages and energy.', 'FaClock', ORANGE], ['CH failure', 'If the CH dies, its members lose their data.', 'FaExclamationTriangle', ORANGE],
      ['Far base station', 'CH → BS links become very expensive (d⁴).', 'FaRoute', AQUA], ['Security', 'Radio messages can be read or forged — protection costs energy.', 'FaLock', RED]];
    p.forEach(([h, b, ic, col], i) => card(s, 0.6 + (i % 3) * 4.1, 1.5 + Math.floor(i / 3) * 2.65, 3.85, 2.4, { head: h, body: b, icon: ic, color: col, size: 14, headSize: 16 }));
  }

  // ================= 02 ENERGY & FIRST EXPERIMENTS =================
  section('02', 'Energy model & first experiments', 'How energy is calculated, the tools, and the first ns-3 runs');
  {
    const s = base(); title(s, 'How the energy is calculated', 'First-order radio model (Heinzelman et al.) — used by every paper we compare with');
    eqBox(s, 'eq_energy.png', 0.6, 1.55, 5.4, 2.35);
    tbl(s, [['Symbol', 'Meaning', 'Value'], ['k', 'bits in the packet', '2000 data / 200 control'], ['E_elec', 'radio electronics', '50 nJ/bit'],
      ['ε_fs', 'amplifier, short range', '10 pJ/bit/m²'], ['ε_mp', 'amplifier, long range', '0.0013 pJ/bit/m⁴'], ['E_DA', 'fusion at the CH', '5 nJ/bit/signal']],
    0.6, 4.05, 5.4, [1.1, 2.3, 2.0], { size: 12, rowH: 0.36 });
    img(s, 'e1_energy_distance.png', 6.3, 1.5, 6.5, 4.9);
    band(s, 'Short links: the electronics dominate — receiving is not free.  Long links (> d0): the cost explodes.', 6.5);
  }
  {
    const s = base(); title(s, 'Worked example — why the CH is the one that dies', '100 nodes, 0.5 J each (50 J in total), one 2000-bit reading per node per round');
    tbl(s, [['Role in one round', 'What it pays', 'Energy'], ['Member (15 m from its CH)', 'send one packet', '≈ 0.10 mJ'],
      ['CH with 20 members', 'receive 20 + fuse 21 + send to BS', '≈ 2.6 mJ'], ['Receiving one control message', '200 bits × 50 nJ', '10 µJ']],
    0.6, 1.6, 7.4, [2.8, 3.0, 1.6], { size: 14, rowH: 0.55 });
    stat(s, 8.5, 1.55, 4.2, '≈ 26×', 'a CH spends about 26 times more than a member in the same round', RED);
    stat(s, 8.5, 3.5, 4.2, '5000', 'rounds a node could live as a member only (0.5 J ÷ 0.1 mJ)', BLUE);
    band(s, 'Every protocol competes on one question: how to rotate the CH role fairly and make it cheaper.', 5.2);
    note(s, 'This is why rotation and CH protection matter. FND measures exactly this.');
  }
  {
    const s = base(); title(s, 'Tools', 'Ubuntu (VMware) · ns-3.41 (C++) · NetAnim · Wireshark · Python');
    imgAbs(s, path.join(SHOTS, 'vm_settings.png'), 0.6, 1.5, 6.0, 4.7);
    imgAbs(s, path.join(SHOTS, 'vm_ubuntu.png'), 6.8, 1.5, 5.9, 4.7);
    band(s, 'ns-3.41 built from source inside an Ubuntu virtual machine; results processed in Python.', 6.45);
  }
  {
    const s = base(); title(s, 'Running ns-3 for the first time', 'Every experiment is a C++ file in scratch/ and runs with ./ns3 run · NetAnim is started from its own folder');
    imgAbs(s, path.join(SHOTS, 'run_template.png'), 0.6, 1.55, 12.1, 2.6);
    imgAbs(s, path.join(SHOTS, 'netanim_cmd.png'), 0.6, 4.35, 12.1, 1.0);
    band(s, 'Step 1: check that ns-3.41 builds and runs (scratch-simulator).  Step 2: open NetAnim to watch the XML trace.', 6.1);
  }
  {
    const s = base(); title(s, 'Experiment 1 — WSN-Day3: 3 sensors → 1 sink', 'Real IEEE 802.15.4 (lr-wpan) MAC · every data frame asks for an ACK · 5 packets per sensor');
    imgAbs(s, path.join(SHOTS, 'day3_terminal.png'), 0.6, 1.5, 6.0, 4.75);
    imgAbs(s, path.join(SHOTS, 'day3_summary.png'), 6.75, 1.5, 6.0, 4.75);
    band(s, 'Each line: a sensor sends → the sink receives (LQI 255) → the MAC confirms SUCCESS (ACK received).  Result: 15 / 15, PDR 100 %.', 6.45);
  }
  {
    const s = base(); title(s, 'Experiment 2 — energy model + long run', 'wsn_first_packet · 3 sensors + sink · 100 J each · one 50-byte packet every 10 s · 1000 s');
    imgAbs(s, path.join(SHOTS, 'first_packet_run.png'), 0.6, 1.5, 6.0, 4.75);
    imgAbs(s, path.join(SHOTS, 'first_packet_energy.png'), 6.75, 1.5, 6.0, 4.75);
    band(s, '300 / 300 packets delivered, but every node used ≈ 62.6 J — the radio spends energy even when it only listens.', 6.45);
  }
  {
    const s = base(); title(s, 'Experiment 2 in NetAnim', 'Left: packets moving to the sink · right: remaining energy of every node over time (Stats → Counter Tables)');
    imgAbs(s, path.join(SHOTS, 'first_netanim.png'), 0.6, 1.5, 6.6, 4.75);
    imgAbs(s, path.join(SHOTS, 'netanim_stats.png'), 7.4, 1.5, 5.3, 4.75);
    band(s, 'The energy of each node drops step by step (100 → 99.37 → 98.75 J …) — the same numbers the code prints.', 6.45);
  }
  {
    const s = base(); title(s, 'Reading the packets in Wireshark', 'Capture of the sink (wsn-day3-3-0.pcap): data frame (31 bytes) → ACK (5 bytes), for every packet');
    imgAbs(s, path.join(SHOTS, 'wireshark_day3.png'), 0.6, 1.45, 6.2, 3.25);
    bullets(s, ['Source 0x0001 → destination 0x0004 (the sink)', 'The ACK comes ≈ 0.2 ms later', '“LwMesh” is only a Wireshark guess: Analyze → Enabled Protocols → untick LWM',
      'FCS is valid (checksums enabled in the code)'], 7.1, 1.5, 5.6, 3.2, 15);
    img(s, 'k2_frame_decode.png', 0.6, 4.75, 12.1, 1.6);
    band(s, 'Frame 1 byte by byte: 9 header bytes + 20 payload bytes + 2 FCS bytes = 31 bytes.', 6.45);
  }
  {
    const s = base(); title(s, 'Demo — clustering with real packets', '12 sensors · 3 clusters · 1 sink · CH rotates every round · TDMA · fusion');
    img(s, 'demo_layout.png', 0.6, 1.5, 12.1, 3.9);
    const d = JSON.parse(fs.readFileSync(path.join(FIG, 'demo_results.json'), 'utf8'));
    const st = [[String(d.readingsGenerated), 'readings generated in 6 rounds', BLUE], [d.pdr.toFixed(0) + '%', 'reached the sink', AQUA],
      [String(d.packetsToSink), 'packets to the sink after fusion', ORANGE], [(100 * (1 - d.packetsToSink / d.readingsGenerated)).toFixed(0) + '%', 'fewer long transmissions', NAVY]];
    st.forEach(([b, l, c], k) => stat(s, 0.6 + k * 3.1, 5.5, 2.9, b, l, c));
  }
  {
    const s = base(); title(s, 'Demo — terminal output', 'Every packet is printed: member → CH (TDMA slot), CH fuses 4 readings, CH → sink');
    imgAbs(s, path.join(SHOTS, 'demo_terminal.png'), 0.6, 1.5, 6.0, 4.75);
    imgAbs(s, path.join(SHOTS, 'demo_results.png'), 6.75, 1.5, 6.0, 4.75);
    band(s, '72 readings, PDR 100 %, but only 18 packets reach the sink (instead of 72) — that is the saving of clustering.', 6.45);
  }
  {
    const s = base(); title(s, 'Demo in NetAnim', 'End of round 6 — red = CH (CH1, CH4, CH9) · colours = clusters · gold = sink with 72 readings');
    imgAbs(s, path.join(C.ROOT, 'figures', 'ns3_screens', 'demo_netanim.png'), 0.6, 1.5, 12.1, 4.85);
    band(s, 'Every node shows its remaining energy (16.3 J of 20 J); the CH role moved to a new node every round.', 6.5);
  }
  {
    const s = base(); title(s, 'Demo packets in Wireshark', 'Capture of CH / sink traffic (demo-clustered-wsn-12-0.pcap): 51-byte data frames, each answered by a 5-byte ACK');
    imgAbs(s, path.join(SHOTS, 'wireshark_demo.png'), 0.6, 1.45, 7.2, 4.9);
    img(s, 'k1_packets.png', 8.0, 1.45, 4.7, 4.9);
    band(s, 'Each member frame: 9-byte header + 40-byte reading + 2-byte FCS = 51 bytes; the ACK proves it arrived.', 6.5);
  }

  // ================= 03 CLASSIC =================
  section('03', 'Classic protocols', 'LEACH · HEED · PEGASIS — paper → our ORIGINAL code → our EDITED code');
  {
    const s = base(); title(s, 'The three classic papers');
    const c = [['LEACH (2000) [1]', 'FaRandom', BLUE, 'Random CH rotation with an epoch: a node that served waits until everybody has served (set G).', 'Energy-blind; CHs may be badly placed.'],
      ['HEED (2004) [3]', 'FaHandshake', ORANGE, 'Residual energy decides who leads; the probability doubles every iteration; members join the lowest-cost CH.', 'Negotiation messages every round.'],
      ['PEGASIS (2002) [4]', 'FaStream', AQUA, 'One greedy chain; data fused along the chain; one leader, in turn, talks to the BS.', 'Long delay, long chain links, single leader.']];
    c.forEach(([h, ic, col, idea, flaw], i) => {
      const x = 0.6 + i * 4.1;
      card(s, x, 1.5, 3.85, 5.35, { head: h, icon: ic, color: col, headSize: 16, size: 14, body: '' });
      s.addText([{ text: 'Idea', options: { bold: true, color: col, breakLine: true } }, { text: idea, options: { breakLine: true } }, { text: ' ', options: { breakLine: true } },
        { text: 'Weakness', options: { bold: true, color: RED, breakLine: true } }, { text: flaw }],
      { x: x + 0.25, y: 2.5, w: 3.35, h: 4.2, fontSize: 16, color: INK, fontFace: BODY, valign: 'top', margin: 0, isTextBox: true });
    });
  }
  {
    const s = base(); title(s, 'Key equations of the classic protocols');
    const e = [['LEACH', 'eq_leach.png', BLUE], ['HEED', 'eq_heed.png', ORANGE], ['PEGASIS', 'eq_pegasis.png', AQUA]];
    e.forEach(([n, f, col], i) => { const y = 1.5 + i * 1.75;
      s.addText(n, { x: 0.6, y, w: 2.2, h: 1.5, fontSize: 20, bold: true, color: col, fontFace: HEAD, valign: 'middle', margin: 0, isTextBox: true });
      eqBox(s, f, 2.9, y, 9.8, 1.5); });
  }
  {
    const s = base(); title(s, 'ORIGINAL — each paper in its own settings', 'Goal: prove that our code reproduces the paper');
    tbl(s, [['', 'LEACH', 'HEED', 'PEGASIS'], ['Nodes', '100', '500', '100'], ['Field', '50 × 50 m', '100 × 100 m', '50 × 50 m'],
      ['Base station', '(25, −100) far', '(50, 175) far', '(25, 150) far'], ['Energy / node', '0.5 J', '2 J', '0.5 J'], ['Packet', '2000 bits', '1000 bits × 5 frames', '2000 bits'],
      ['Radio', 'one amplifier (100 pJ)', 'two-slope, d0 = 75 m', 'one amplifier (100 pJ)']],
    0.6, 1.6, 12.1, [2.4, 3.2, 3.3, 3.2], { size: 14, rowH: 0.52, center: true, boldFirst: true });
    band(s, 'Nothing is changed in the algorithms; only the paper\'s own parameters are used.', 5.6);
  }
  {
    const s = base(); title(s, 'ORIGINAL results — paper vs our code', 'Same settings as each paper; FND / HND / LND in rounds');
    const lo = C.get('leach_ORIGINAL'), ho = C.get('heed_ORIGINAL'), po = C.get('pegasis_ORIGINAL');
    tbl(s, [['Protocol', 'Metric', 'Paper', 'Our code', 'Difference'],
      ['LEACH', 'FND', 932, lo.F, chg(lo.F, 932)], ['LEACH', 'HND', '—', lo.H, '—'], ['LEACH', 'LND', 1312, lo.L, chg(lo.L, 1312)],
      ['HEED', 'FND / HND / LND', 'graphs only', `${ho.F} / ${ho.H} / ${ho.L}`, 'behaviour matches'],
      ['PEGASIS', 'FND', 1578, po.F, chg(po.F, 1578)], ['PEGASIS', 'HND', 2082, po.H, chg(po.H, 2082)], ['PEGASIS', 'LND', 2192, po.L, chg(po.L, 2192)]],
    0.6, 1.5, 12.1, [2.2, 2.6, 2.4, 2.6, 2.3], { size: 15, rowH: 0.56, center: true, boldFirst: true });
    band(s, 'LND within 1 % (LEACH) and every PEGASIS value within 3.5 % → the code reproduces the papers.', 6.3);
  }
  {
    const s = base(); title(s, 'ORIGINAL results — chart', 'Published (grey) vs our ORIGINAL code (blue)');
    const lo = C.get('leach_ORIGINAL'), po = C.get('pegasis_ORIGINAL');
    const labels = ['LEACH FND', 'LEACH LND', 'PEGASIS FND', 'PEGASIS HND', 'PEGASIS LND'];
    s.addChart(pres.charts.BAR, [{ name: 'Published', labels, values: [932, 1312, 1578, 2082, 2192] }, { name: 'Our ORIGINAL code', labels, values: [lo.F, lo.L, po.F, po.H, po.L] }], Object.assign(chartBase(), {
      x: 0.6, y: 1.4, w: 12.1, h: 5.5, barDir: 'col', barGrouping: 'clustered', chartColors: [GREY, BLUE], showLegend: true, legendPos: 't',
      showValue: true, dataLabelPosition: 'outEnd', valAxisTitle: 'Rounds', showValAxisTitle: true, valAxisTitleColor: MUTED }));
  }
  {
    const s = base(); title(s, 'EDITED — one unified environment for all protocols', 'Same algorithms; only the environment changes, so the comparison is fair');
    tbl(s, [['Parameter', 'Value']].concat(C.ENV.slice(0, 10)), 0.6, 1.5, 6.9, [2.6, 4.3], { size: 12.5, rowH: 0.42 });
    card(s, 7.8, 1.5, 4.9, 4.85, { head: 'Same rules for everyone', icon: 'FaBalanceScale', color: BLUE, size: 14,
      body: '• Same node positions (same seed)\n• CH advertisement heard by every node\n• join + TDMA messages are charged\n• CH fuses members + its own reading\n• a node without a CH sends directly\n• every run lasts until the last node dies' });
    band(s, 'Why these values? They are the standard settings of the LEACH literature and the standard radio model.', 6.5);
  }
  const CL = [['LEACH', 'leach'], ['HEED', 'heed'], ['PEGASIS', 'pegasis']];
  {
    const s = base(); title(s, 'EDITED results — classic protocols', 'Unified environment, BS at the centre');
    tbl(s, [['Protocol', 'FND', 'HND', 'LND', 'PDR']].concat([...CL, ['HEED + fairness', 'heed_fairness']].map(([n, k]) => res(n, k.includes('fair') ? 'heed_fairness_EDITED' : k + '_EDITED'))),
      0.6, 1.5, 6.4, [2.2, 1.05, 1.05, 1.05, 1.05], { size: 15, rowH: 0.6, center: true, boldFirst: true });
    pdrChart(s, ['LEACH', 'HEED', 'HEED+fair', 'PEGASIS'], ['leach_EDITED', 'heed_EDITED', 'heed_fairness_EDITED', 'pegasis_EDITED'], 7.3, 1.4, 5.5, 4.6);
    band(s, `Best first death: LEACH (${leach.F}).  Earliest: HEED (${heed.F}).  Longest last node: PEGASIS (${peg.L}).`, 6.4);
  }
  {
    const s = base(); title(s, 'EDITED results — chart', 'FND / HND / LND in the unified environment');
    lifeChart(s, ['LEACH', 'HEED', 'HEED + fairness', 'PEGASIS'], ['leach_EDITED', 'heed_EDITED', 'heed_fairness_EDITED', 'pegasis_EDITED'], 0.6, 1.4, 12.1, 5.5);
  }
  {
    const s = base(); title(s, 'Comparison — ORIGINAL vs EDITED', 'The same code in two environments');
    const rows = [['Protocol', 'Metric', 'ORIGINAL (paper settings)', 'EDITED (unified)', 'Change']];
    CL.forEach(([n, k]) => { const o = C.get(k + '_ORIGINAL'), e = C.get(k + '_EDITED');
      [['FND', 'F'], ['HND', 'H'], ['LND', 'L']].forEach(([m, f]) => rows.push([n, m, o[f], e[f], chg(e[f], o[f])])); });
    tbl(s, rows, 0.6, 1.45, 12.1, [2.2, 1.6, 3.2, 2.9, 2.2], { size: 13, rowH: 0.47, center: true, boldFirst: true });
  }
  {
    const s = base(); title(s, 'Comparison — chart', 'Paper vs our ORIGINAL vs our EDITED');
    img(s, 'p1_baselines.png', 0.6, 1.45, 12.1, 5.4);
  }
  {
    const s = base(); title(s, 'Why did the numbers change so much?');
    const r = [['LEACH  ↑ (FND ' + F('leach_ORIGINAL') + ' → ' + leach.F + ')', ['Amplifier 10× cheaper: 10 pJ instead of 100 pJ.', 'BS at the centre (≤ 70 m) instead of 100 – 150 m away.', 'These savings are bigger than the setup messages we added.'], BLUE],
      ['HEED  ↓ (FND ' + F('heed_ORIGINAL') + ' → ' + heed.F + ')', ['Paper: 1 election then 5 data packets; unified: 1 election for 1 packet.', 'Election messages every round, each heard by ~20 neighbours.', '0.5 J instead of 2 J per node.'], ORANGE],
      ['PEGASIS  FND ↓, LND ↑ (' + F('pegasis_ORIGINAL') + ' → ' + peg.F + ')', ['Field 4× bigger → one greedy chain link of 91.5 m (> d0, cost d⁴).', 'Node 73 on that link died first.', 'Cheap radio + central BS → the last nodes live very long.'], AQUA]];
    r.forEach(([h, pts, col], i) => { const x = 0.6 + i * 4.1;
      card(s, x, 1.5, 3.85, 4.75, { head: h, color: col, headSize: 15, body: '' });
      bullets(s, pts, x + 0.25, 2.45, 3.4, 3.7, 14); });
    band(s, 'The algorithms did not change — only the environment. That is why a fair comparison needs one environment.', 6.45);
  }
  {
    const s = base(); title(s, 'Classic protocols — base station far away', 'Same codes with the BS at (50, −100)');
    tbl(s, [['Protocol', 'FND centre', 'FND far', 'HND far', 'LND far', 'PDR far', 'Change of FND']].concat(CL.map(([n, k]) => { const c = C.get(k + '_EDITED'), f = C.get(k + '_EDITED_farBS');
      return [n, c.F, f.F, f.H, f.L, C.pct(f.P), chg(f.F, c.F)]; })), 0.6, 1.5, 12.1, [2.0, 1.6, 1.6, 1.6, 1.6, 1.7, 2.0], { size: 15, rowH: 0.6, center: true, boldFirst: true });
    const lab = ['LEACH', 'HEED', 'PEGASIS'];
    s.addChart(pres.charts.BAR, [{ name: 'BS at the centre', labels: lab, values: CL.map(([, k]) => F(k + '_EDITED')) }, { name: 'BS far away', labels: lab, values: CL.map(([, k]) => FF(k + '_EDITED')) }],
      Object.assign(chartBase(), { x: 0.6, y: 3.9, w: 7.4, h: 3.0, barDir: 'col', barGrouping: 'clustered', chartColors: ['C9C8C2', ORANGE], showLegend: true, legendPos: 'r', showValue: true, dataLabelPosition: 'outEnd' }));
    card(s, 8.3, 3.95, 4.4, 2.95, { head: 'Far BS', icon: 'FaMapMarkedAlt', color: ORANGE, size: 13,
      body: `LEACH and HEED lose 29 % and 48 %: every CH sends far (d⁴).\nPEGASIS keeps its FND (${FF('pegasis_EDITED')}): only one leader talks to the BS.` });
  }
  {
    const s = base(); title(s, 'Classic protocols — summary');
    const d = [['LEACH', BLUE, ['Random rotation with an epoch', 'Energy-blind; setup every round'], 'leach'],
      ['HEED', ORANGE, ['Energy + neighbours, iterative election', 'Election messages every round'], 'heed'],
      ['PEGASIS', AQUA, ['One chain, one leader to the BS', 'Long chain links, delay, single leader'], 'pegasis']];
    d.forEach(([n, col, [idea, weak], k], i) => { const x = 0.6 + i * 4.1, o = C.get(k + '_ORIGINAL'), e = C.get(k + '_EDITED'), f = C.get(k + '_EDITED_farBS');
      card(s, x, 1.45, 3.85, 5.45, { head: n, color: col, headSize: 20, body: '' });
      s.addText([{ text: 'Idea', options: { bold: true, color: col, breakLine: true } }, { text: idea, options: { breakLine: true } },
        { text: 'Weakness', options: { bold: true, color: RED, breakLine: true } }, { text: weak, options: { breakLine: true } },
        { text: 'Results (FND)', options: { bold: true, color: NAVY, breakLine: true } },
        { text: `Paper settings: ${o.F}`, options: { breakLine: true } }, { text: `Unified, BS centre: ${e.F}`, options: { breakLine: true } }, { text: `Unified, BS far: ${f.F}`, options: { breakLine: true } },
        { text: `PDR (centre): ${C.pct(e.P)}` }],
      { x: x + 0.25, y: 2.25, w: 3.4, h: 4.5, fontSize: 15, color: INK, fontFace: BODY, valign: 'top', margin: 0, paraSpaceAfter: 5, isTextBox: true }); });
  }
  // ================= 04 HYBRIDS =================
  section('04', 'Hybrid protocols', 'LEACH + HEED hybrids — paper → ORIGINAL → EDITED → IMPROVED');
  {
    const s = base(); title(s, 'Introduction — what is a LEACH + HEED hybrid?', 'Our work, and the three papers, combine the strengths of both protocols');
    card(s, 0.6, 1.5, 3.9, 4.7, { head: 'From LEACH', icon: 'FaRandom', color: BLUE, size: 15, body: '• simple random election\n• rotation with epoch and G-set\n• join the nearest CH\n• TDMA + fusion at the CH' });
    s.addText('+', { x: 4.55, y: 3.2, w: 0.6, h: 0.9, fontSize: 48, bold: true, color: MUTED, align: 'center', fontFace: HEAD, margin: 0, isTextBox: true });
    card(s, 5.2, 1.5, 3.9, 4.7, { head: 'From HEED', icon: 'FaHandshake', color: ORANGE, size: 15, body: '• residual energy decides who leads\n• connectivity (node degree / cost)\n• well-spread cluster heads' });
    s.addText('=', { x: 9.15, y: 3.2, w: 0.6, h: 0.9, fontSize: 48, bold: true, color: MUTED, align: 'center', fontFace: HEAD, margin: 0, isTextBox: true });
    card(s, 9.8, 1.5, 2.9, 4.7, { head: 'Hybrid', icon: 'FaLayerGroup', color: AQUA, size: 15, body: 'LEACH speed and rotation with HEED\'s energy awareness — without HEED\'s negotiation.' });
    band(s, 'SH-LEACH (2015), H-LEACH (2016) and EECH-HEED (2025) follow this idea — and so does our protocol.', 6.45);
  }
  {
    const s = base(); title(s, 'The three hybrid papers', 'Each adds energy (HEED idea) to LEACH-style rotation');
    const c = [['SH-LEACH (2015) [5]', 'eq_shleach.png', 'energy + round number + CH counter'],
      ['H-LEACH (2016) [6]', 'eq_hleach.png', 'personal energy-based probability + energy gate'],
      ['EECH-HEED (2025) [7]', 'eq_eech.png', 'two zones, relays between CHs, adaptive sensing']];
    c.forEach(([h, f, idea], i) => {
      const y = 1.5 + i * 1.8;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.1, h: 1.65, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { color: LINE, width: 1 } });
      s.addText([{ text: h, options: { bold: true, color: NAVY, fontSize: 17, breakLine: true } }, { text: idea, options: { color: MUTED, fontSize: 13 } }],
        { x: 0.85, y, w: 3.1, h: 1.65, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
      img(s, f, 4.1, y + 0.12, 8.45, 1.41);
    });
  }
  const HY = [['SH-LEACH', 'shleach'], ['H-LEACH', 'hleach'], ['EECH-HEED', 'eechheed']];
  {
    const s = base(); title(s, 'ORIGINAL — the hybrids in their own settings');
    tbl(s, [['', 'SH-LEACH', 'H-LEACH', 'EECH-HEED'], ['Deployment', '100 nodes, 100 × 100 m', '100 nodes, 100 × 100 m', '30 near BS + 70 far; 14 advanced nodes'],
      ['Energy', '0.5 J', '0.5 J', '0.3 – 1.5 J (≈ 56 J total)'], ['Packet', '2000 bits (not stated)', '4000 bits', '4000 bits, E_DA 50 nJ'],
      ['Radio', 'one amplifier 100 pJ', 'two-slope', 'two-slope'], ['Other', 'C_prob = 0.1', 'no setup messages', 'adaptive sensing ON']],
    0.6, 1.5, 12.1, [2.7, 3.0, 3.1, 3.3], { size: 14, rowH: 0.6, center: true, boldFirst: true });
  }
  {
    const s = base(); title(s, 'ORIGINAL results — paper vs our code');
    const sh = C.get('shleach_ORIGINAL'), hl = C.get('hleach_ORIGINAL'), ee = C.get('eechheed_ORIGINAL');
    tbl(s, [['Protocol', 'Metric', 'Paper', 'Our code', 'Difference'],
      ['SH-LEACH', 'FND / HND / LND', 'graphs only', `${sh.F} / ${sh.H} / ${sh.L}`, '—'],
      ['H-LEACH', 'FND / HND', 'not reported', `${hl.F} / ${hl.H}`, '—'], ['H-LEACH', 'LND', '≈ 4312', hl.L, 'paper value not reachable*'],
      ['EECH-HEED', 'FND', 1250, ee.F, chg(ee.F, 1250)], ['EECH-HEED', 'HND', 1650, ee.H, chg(ee.H, 1650)], ['EECH-HEED', 'LND', 2200, ee.L, chg(ee.L, 2200)],
      ['EECH-HEED', 'PDR', '95 %', C.pct(ee.P), '—']],
    0.6, 1.45, 12.1, [2.2, 2.4, 2.3, 2.6, 2.6], { size: 14, rowH: 0.52, center: true, boldFirst: true });
    band(s, '* 4000-bit packets use up the 50 J before round 2500.  EECH-HEED depends on the sensor signal the paper does not give (sensing OFF → FND 420).', 6.2);
  }
  {
    const s = base(); title(s, 'ORIGINAL results — chart', 'Our code in each paper\'s settings (EECH-HEED also vs its paper)');
    const ee = C.get('eechheed_ORIGINAL');
    lifeChart(s, ['SH-LEACH', 'H-LEACH', 'EECH-HEED'], ['shleach_ORIGINAL', 'hleach_ORIGINAL', 'eechheed_ORIGINAL'], 0.6, 1.4, 7.2, 5.5);
    s.addChart(pres.charts.BAR, [{ name: 'Paper', labels: ['FND', 'HND', 'LND'], values: [1250, 1650, 2200] }, { name: 'Our code', labels: ['FND', 'HND', 'LND'], values: [ee.F, ee.H, ee.L] }], Object.assign(chartBase(), {
      x: 8.0, y: 1.4, w: 4.8, h: 5.5, barDir: 'col', barGrouping: 'clustered', chartColors: [GREY, BLUE], showLegend: true, legendPos: 't', showValue: true, dataLabelPosition: 'outEnd',
      showTitle: true, title: 'EECH-HEED: paper vs code', titleFontSize: 13, titleColor: INK }));
  }
  {
    const s = base(); title(s, 'EDITED results — hybrids in the unified environment', 'Same algorithms as in the papers');
    tbl(s, [['Protocol', 'FND', 'HND', 'LND', 'PDR']].concat(HY.map(([n, k]) => res(n, k + '_EDITED'))).concat([res('LEACH (reference)', 'leach_EDITED')]),
      0.6, 1.5, 6.4, [2.4, 1.0, 1.0, 1.0, 1.0], { size: 15, rowH: 0.6, center: true, boldFirst: true });
    pdrChart(s, ['SH-LEACH', 'H-LEACH', 'EECH-HEED', 'LEACH'], ['shleach_EDITED', 'hleach_EDITED', 'eechheed_EDITED', 'leach_EDITED'], 7.3, 1.4, 5.5, 4.6);
    band(s, `None of the three beats LEACH (${leach.F}); SH-LEACH dies after only ${F('shleach_EDITED')} rounds.`, 6.4);
  }
  {
    const s = base(); title(s, 'EDITED results — chart', 'FND / HND / LND in the unified environment');
    lifeChart(s, ['SH-LEACH', 'H-LEACH', 'EECH-HEED', 'LEACH'], ['shleach_EDITED', 'hleach_EDITED', 'eechheed_EDITED', 'leach_EDITED'], 0.6, 1.4, 12.1, 5.5);
  }
  {
    const s = base(); title(s, 'EDITED — what went wrong', 'In the unified environment each hybrid shows a design flaw');
    const c = [['SH-LEACH', `FND ${F('shleach_EDITED')}`, 'r is never reset → the probability keeps growing → up to 100 CHs per round: every node sends alone to the BS.'],
      ['H-LEACH', `FND ${F('hleach_EDITED')}`, '"E > average" with equal energy → no CH in round 1 (deadlock); no G-set → bursts of up to 59 CHs.'],
      ['EECH-HEED', `FND ${F('eechheed_EDITED')}`, 'Zone 2: P ≈ 1 → rotation period 1/P ≈ 1 round → the same border nodes are CH every other round (219 times).']];
    c.forEach(([h, r, flaw], i) => {
      const y = 1.5 + i * 1.6;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.1, h: 1.45, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { color: LINE } });
      circleIcon(s, 'FaBug', 0.85, y + 0.4, 0.65, RED);
      s.addText(`${h}\n${r}`, { x: 1.75, y, w: 2.3, h: 1.45, fontSize: 17, bold: true, color: NAVY, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
      s.addText(flaw, { x: 4.1, y, w: 8.4, h: 1.45, fontSize: 16, color: INK, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
    });
    band(s, 'All three add energy to LEACH but break its rotation.', 6.45);
  }
  {
    const s = base(); title(s, 'Why did the numbers change so much?');
    const r = [['SH-LEACH', [`ORIG → EDIT (${F('shleach_ORIGINAL')} → ${F('shleach_EDITED')}): cheaper radio (10 vs 100 pJ).`, `EDIT → IMPR (→ ${F('shleach_IMPROVED')}, ×${(F('shleach_IMPROVED') / F('shleach_EDITED')).toFixed(1)}): the counter restarts, so CHs stay few instead of reaching 100.`], BLUE],
      ['H-LEACH', [`ORIG → EDIT (${F('hleach_ORIGINAL')} → ${F('hleach_EDITED')}): packet 2000 instead of 4000 bits (half the energy per message).`, `EDIT → IMPR (→ ${F('hleach_IMPROVED')}): no deadlock, no CH bursts (8.6 → 5.3 CHs per round).`], ORANGE],
      ['EECH-HEED', [`ORIG → EDIT: LND ${C.get('eechheed_ORIGINAL').L} → ${C.get('eechheed_EDITED').L} because sensing is OFF (every node sends every round) and 50 J instead of 56 J.`, `EDIT → IMPR (${F('eechheed_EDITED')} → ${F('eechheed_IMPROVED')}): fixed rotation in zone 2 (7.6 → 2.9 CHs per round).`], AQUA]];
    r.forEach(([h, pts, col], i) => { const x = 0.6 + i * 4.1;
      card(s, x, 1.5, 3.85, 4.75, { head: h, color: col, headSize: 17, body: '' });
      bullets(s, pts, x + 0.25, 2.3, 3.4, 3.9, 14); });
    band(s, 'ORIGINAL → EDITED = environment only.  EDITED → IMPROVED = our one-line fix only.', 6.45);
  }

  {
    const s = base(); title(s, 'IMPROVED — our fixes', 'One or two lines of code per protocol; nothing else changed');
    const fx = [['SH-LEACH', 'r → ((r − 1) mod 1/C) + 1 : the counter restarts every 10 rounds'],
      ['H-LEACH', '"E > E_avg" → "E ≥ E_avg"  +  LEACH G-set restored'],
      ['EECH-HEED', 'Zone 2 uses the paper\'s 10 % for the period and the G-set; Eq. 5 becomes a weight']];
    fx.forEach(([h, b], i) => card(s, 0.6, 1.5 + i * 1.65, 6.4, 1.45, { head: h, body: b, icon: 'FaWrench', color: BLUE, size: 13, headSize: 16 }));
    ['eq_fix1.png', 'eq_fix2.png', 'eq_fix3.png'].forEach((f, i) => eqBox(s, f, 7.2, 1.5 + i * 1.65, 5.5, 1.45));
    lesson(s, 'energy alone is not enough — the rotation (epoch / G-set) must be kept.');
  }
  {
    const s = base(); title(s, 'IMPROVED results', 'Unified environment + our fix');
    tbl(s, [['Protocol', 'FND', 'HND', 'LND', 'PDR']].concat(HY.map(([n, k]) => res(n + '+', k + '_IMPROVED'))).concat([res('LEACH (reference)', 'leach_EDITED')]),
      0.6, 1.5, 6.4, [2.4, 1.0, 1.0, 1.0, 1.0], { size: 15, rowH: 0.6, center: true, boldFirst: true });
    pdrChart(s, ['SH-LEACH+', 'H-LEACH+', 'EECH-HEED+', 'LEACH'], ['shleach_IMPROVED', 'hleach_IMPROVED', 'eechheed_IMPROVED', 'leach_EDITED'], 7.3, 1.4, 5.5, 4.6);
    band(s, `After the fix SH-LEACH+ (${best.F}) and H-LEACH+ (${F('hleach_IMPROVED')}) beat LEACH (${leach.F}).`, 6.4);
  }
  {
    const s = base(); title(s, 'The flaw in numbers — cluster heads per round', 'Grey = paper algorithm (EDITED) · blue = after our fix (IMPROVED)');
    img(s, 'h1_hybrid_ch.png', 0.6, 1.5, 12.1, 4.7);
    band(s, 'SH-LEACH reaches 100 CHs (every node alone); H-LEACH and EECH-HEED elect too many CHs, too often.', 6.45);
  }
  {
    const s = base(); title(s, 'Comparison — ORIGINAL vs EDITED vs IMPROVED', 'Every hybrid, every version');
    const rows = [['Protocol', 'Metric', 'ORIGINAL', 'EDITED', 'IMPROVED', 'EDITED → IMPROVED']];
    HY.forEach(([n, k]) => { const o = C.get(k + '_ORIGINAL'), e = C.get(k + '_EDITED'), m = C.get(k + '_IMPROVED');
      [['FND', 'F'], ['HND', 'H'], ['LND', 'L']].forEach(([mt, f]) => rows.push([n, mt, o[f], e[f], m[f], chg(m[f], e[f])]));
      rows.push([n, 'PDR', C.pct(o.P), C.pct(e.P), C.pct(m.P), '']); });
    tbl(s, rows, 0.6, 1.4, 12.1, [2.2, 1.3, 2.0, 2.0, 2.0, 2.6], { size: 11.5, rowH: 0.4, center: true, boldFirst: true });
  }
  {
    const s = base(); title(s, 'Comparison — chart', 'ORIGINAL (grey) · EDITED (orange) · IMPROVED (blue)');
    img(s, 'h2_hybrids_all.png', 0.6, 1.45, 12.1, 5.4);
  }
  {
    const HS = [['SH-LEACH', 'shleach', BLUE, ['LEACH + residual energy + round number'],
        ['the round counter r never resets', 'CHs grow to 100 per round: every node sends alone to the BS'], ['r restarts every 1/C_prob = 10 rounds (one line of code)']],
      ['H-LEACH', 'hleach', ORANGE, ['LEACH threshold with an energy-based probability', 'CH only if E > network average'],
        ['equal energy → nobody is above average → no CH (deadlock)', 'no G-set → bursts of up to 59 CHs'], ['E ≥ average', 'LEACH G-set restored']],
      ['EECH-HEED', 'eechheed', AQUA, ['two zones: HEED near the BS, energy × degree far away', 'relays between CHs, adaptive sensing'],
        ['zone 2: P ≈ 1 → rotation period of 1 round', 'the same border nodes are CH every other round (219 times)'], ['zone 2 rotation fixed at the paper\'s 10 % (10 rounds)', 'energy × degree kept as a weight']]];
    for (const [n, k, col, idea, prob, fix] of HS) {
      const s = base(); title(s, `${n} — idea, problems, fix and results`);
      const o = C.get(k + '_ORIGINAL'), e = C.get(k + '_EDITED'), m = C.get(k + '_IMPROVED');
      const col3 = [['Idea', idea, col], ['Problems found', prob, RED], ['Our fix', fix, BLUE]];
      col3.forEach(([h, pts, c], i) => { card(s, 0.6 + i * 4.1, 1.45, 3.85, 2.55, { head: h, color: c, headSize: 16, body: '' });
        bullets(s, pts, 0.85 + i * 4.1, 2.1, 3.4, 1.85, 15); });
      tbl(s, [['Version', 'FND', 'HND', 'LND', 'PDR', 'FND far BS'], ['ORIGINAL (paper settings)', o.F, o.H, o.L, C.pct(o.P), '—'], ['EDITED (unified)', e.F, e.H, e.L, C.pct(e.P), FF(k + '_EDITED')],
        ['IMPROVED (our fix)', m.F, m.H, m.L, C.pct(m.P), FF(k + '_IMPROVED')]], 0.6, 4.2, 12.1, [3.4, 1.6, 1.6, 1.6, 1.8, 2.1], { size: 14, rowH: 0.5, center: true, boldFirst: true, hlLast: true });
      band(s, `Fix: FND ${e.F} → ${m.F} (${chg(m.F, e.F)}) with the BS at the centre, ${FF(k + '_EDITED')} → ${FF(k + '_IMPROVED')} (${chg(FF(k + '_IMPROVED'), FF(k + '_EDITED'))}) with the BS far away.`, 6.35);
    }
  }
  {
    const s = base(); title(s, 'The three hybrids compared', 'After our fixes · centre and far BS');
    const rows = [['Protocol', 'Problem', 'Fix', 'FND before → after', 'FND far (after)', 'PDR (after)']];
    [['SH-LEACH', 'shleach', 'counter never resets', 'counter restarts'], ['H-LEACH', 'hleach', 'deadlock + no G-set', '≥ average + G-set'], ['EECH-HEED', 'eechheed', 'rotation of 1 round in zone 2', 'fixed 10-round rotation']]
      .forEach(([n, k, p, f]) => rows.push([n, p, f, `${F(k + '_EDITED')} → ${F(k + '_IMPROVED')} (${chg(F(k + '_IMPROVED'), F(k + '_EDITED'))})`, FF(k + '_IMPROVED'), C.pct(C.get(k + '_IMPROVED').P)]));
    rows.push(['LEACH (reference)', '—', '—', String(leach.F), FF('leach_EDITED'), C.pct(leach.P)]);
    tbl(s, rows, 0.6, 1.45, 12.1, [1.9, 2.7, 2.4, 2.3, 1.5, 1.3], { size: 13.5, rowH: 0.62, center: true, centerFrom: 3, boldFirst: true });
    const lab = ['SH-LEACH+', 'H-LEACH+', 'EECH-HEED+', 'LEACH'];
    const runs = ['shleach_IMPROVED', 'hleach_IMPROVED', 'eechheed_IMPROVED', 'leach_EDITED'];
    s.addChart(pres.charts.BAR, [{ name: 'BS at the centre', labels: lab, values: runs.map(F) }, { name: 'BS far away', labels: lab, values: runs.map(FF) }],
      Object.assign(chartBase(), { x: 0.6, y: 4.65, w: 8.0, h: 2.3, barDir: 'col', barGrouping: 'clustered', chartColors: [BLUE, ORANGE], showLegend: true, legendPos: 'r', showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 9 }));
    card(s, 8.9, 4.65, 3.8, 2.3, { head: 'Best hybrid', icon: 'FaTrophy', color: BLUE, size: 13,
      body: `Centre: SH-LEACH+ (${best.F}).\nFar BS: EECH-HEED+ (${FF('eechheed_IMPROVED')}).\nThe biggest gain: SH-LEACH (+129 %).` });
  }
  // ================= 05 RECENT + LIT REVIEW =================
  section('05', 'Recent work & literature review', 'Where the research is going (2024 – 2026)');
  {
    const s = base(); title(s, 'Recent papers (studied, not re-implemented)', 'They need training data or unpublished models — used to compare ideas');
    tbl(s, [['Paper', 'Idea', 'Reported result', 'Limitation'],
      ['RL-ILEACH 2026 [8]', 'Q-learning chooses CHs (energy, density, distance)', '+784 % lifetime vs LEACH', 'FND earlier than ILEACH (524 vs 936); learning cost not measured'],
      ['DL-HEED 2025 [9]', 'Graph neural network inside HEED', 'up to +60 % vs HEED', 'needs training data; heavy on sensors'],
      ['TLC 2024 [10]', 'two-level LEACH with a distance threshold', 'longer lifetime than LEACH variants', 'no CH-failure protection'],
      ['EECH-HEED 2025 [7]', 'two zones + multi-hop + adaptive sensing', 'FND 1250, PDR 95 %', 'rotation breaks in zone 2 (fixed by us)']],
    0.6, 1.5, 12.1, [2.4, 3.6, 2.6, 3.5], { size: 13, rowH: 0.8, boldFirst: true });
    band(s, 'Learning-based election adapts well, but does not always delay the first node death.', 6.45);
  }
  {
    const s = base(); title(s, 'Literature review — summary');
    tbl(s, [['Paper', 'Year', 'CH election', 'Main limitation', 'Used in our protocol'],
      ['LEACH [1]', '2000', 'random T(n), epoch', 'energy-blind', 'rotation T(r) + G-set'], ['LEACH-C [2]', '2002', 'central (BS)', 'global knowledge', 'radio model'],
      ['HEED [3]', '2004', 'iterative energy + cost', 'overhead every round', 'energy × degree (single pass)'], ['PEGASIS [4]', '2002', 'chain leader', 'delay, long links', 'relay idea (only if cheaper)'],
      ['SH-LEACH [5]', '2015', 'LEACH × energy × r', 'CH count grows', 'lesson: keep rotation'], ['H-LEACH [6]', '2016', 'LEACH + E > E_avg', 'deadlock, no G-set', 'energy gate (I5)'],
      ['EECH-HEED [7]', '2025', 'zones, T·α·β', 'rotation collapse', 'relay between CHs'], ['RL-ILEACH [8] / DL-HEED [9]', '2025–26', 'learning', 'training cost', 'energy + degree features'],
      ['FTEC [11] · Pachlor [12]', '2019 · 2022', 'fault tolerance · rotation review', '—', 'backup CH · handover (I2)'], ['EEUC [13] · Chauhan [14]', '2005 · 2021', 'unequal clusters, relays', '—', 'hot-spot lesson, relay rule']],
    0.6, 1.4, 12.1, [2.9, 1.3, 2.6, 2.4, 2.9], { size: 11.5, rowH: 0.47 });
  }
  {
    const s = base(); title(s, 'Research gap');
    card(s, 0.6, 1.5, 6.1, 4.8, { head: 'No existing protocol combines', icon: 'FaBullseye', color: ORANGE, size: 16,
      body: '• a cheap single-pass CH election (energy + connectivity)\n• cluster reuse to cut setup overhead\n• protection of the CH before and after it fails\n• relaying between CHs only when it saves energy\n\n…and they are never compared in the same environment.' });
    card(s, 6.9, 1.5, 5.8, 4.8, { head: 'Our answer', icon: 'FaLightbulb', color: BLUE, size: 16,
      body: '1. Reproduce all protocols fairly (ORIGINAL → EDITED).\n2. Fix the flaws of the hybrids (IMPROVED).\n3. Build a new protocol step by step (v1 → v8-Chain).' });
  }

  // ================= 06 PROPOSED =================
  section('06', 'Proposed protocol', 'v1 → v8-Chain — one change per version');
  {
    const s = base();
    imgAbs(s, path.join(FIG, 'v8_concept.png'), 0.4, 0.3, 12.5, 6.85);
    note(s, 'Concept of the proposed protocol: sensors form clusters, the node with the most energy and neighbours (in its LEACH turn) leads, members send short hops, the CH fuses and sends one packet — directly, or through a nearer CH only if that is cheaper (v8-Chain).');
  }
  {
    const s = base(); title(s, 'How the protocol was built', 'Each version changes one thing, so its effect can be measured alone');
    const v = [['v1', 'HEED election', F('v1_heed_election_leach_join')], ['v2', 'fairness', F('v2_fairness_penalty')], ['v3', 'single pass + reuse', F('v3_single_pass_reuse_int5')],
      ['v4', 'reuse 15', F('v4_reuse_int15')], ['v5', 'backup CH', F('v5b_energy_aware_repair')], ['v6/v7', 'CH chain', F('v6_chain_center')], ['v8', 'I1 – I5', F('v8_center')], ['v8-Chain', 'smart relay', F('v8_chain_center')]];
    s.addShape(pres.shapes.LINE, { x: 0.8, y: 3.35, w: 11.8, h: 0, line: { color: LINE, width: 3 } });
    v.forEach(([n, d, f], i) => { const x = 0.6 + i * 1.53, col = i === 7 ? BLUE : i === 2 || i === 6 ? AQUA : GREY;
      s.addShape(pres.shapes.OVAL, { x: x + 0.5, y: 3.12, w: 0.46, h: 0.46, fill: { color: col }, line: { color: 'FFFFFF', width: 2 } });
      s.addText(n, { x, y: 2.3, w: 1.46, h: 0.6, fontSize: 17, bold: true, color: col === GREY ? INK : col, align: 'center', fontFace: HEAD, margin: 0, isTextBox: true });
      s.addText([{ text: d, options: { breakLine: true, color: MUTED } }, { text: 'FND ' + f, options: { bold: true, color: INK } }],
        { x: x - 0.05, y: 3.8, w: 1.56, h: 1.1, fontSize: 12.5, align: 'center', valign: 'top', fontFace: BODY, margin: 0, isTextBox: true }); });
    band(s, 'Two big jumps: v3 (no negotiation + cluster reuse) and v8 (direct-to-BS + energy gate).', 5.6);
  }
  {
    const EV = C.EVOLUTION;
    for (const [part, a, b] of [[1, 0, 6], [2, 6, 12]]) {
      const s = base(); title(s, `Results of every version (${part}/2)`, 'Unified environment, BS at the centre · change = FND compared with the previous version');
      const rows = [['Version', 'What changed', 'FND', 'HND', 'LND', 'PDR', 'FND change']];
      for (let i = a; i < b; i++) { const [n, r, d] = EV[i]; const x = C.get(r); rows.push([n, d, x.F, x.H, x.L, C.pct(x.P), i ? chg(x.F, C.get(EV[i - 1][1]).F) : '—']); }
      tbl(s, rows, 0.6, 1.5, 12.1, [1.3, 4.3, 1.2, 1.2, 1.2, 1.4, 1.5], { size: 14, rowH: 0.62, center: true, centerFrom: 2, boldFirst: true,
        hl: i => ['v3', 'v8', 'v8-Chain'].includes(rows[i] && rows[i][0]) });
      band(s, part === 1 ? 'v3 is the first big jump: ×4.9 over v2 (no negotiation + cluster reuse).' : `v8 is the second big jump: +${C.gain(C.get('v8_center').F, C.get('v5b_energy_aware_repair').F).toFixed(0)} % over v5b (I1 – I5).  v8-Chain keeps it and adds the far-BS gain.`, 6.4);
    }
  }
  {
    const s = base(); title(s, 'v1 – v2: starting from HEED', 'v1 = HEED election + LEACH nearest-CH join · v2 = + fairness penalty cost × (1 + 0.1·timesServed)');
    singleBar(s, ['v1', 'v2', 'HEED', 'LEACH'], [F('v1_heed_election_leach_join'), F('v2_fairness_penalty'), heed.F, leach.F], [GREY, GREY, ORANGE, BLUE], 0.6, 1.5, 7.2, 4.8, { name: 'FND', valAxisTitle: 'FND (rounds)', showValAxisTitle: true });
    card(s, 8.1, 1.5, 4.6, 4.8, { head: 'What we learned', icon: 'FaSearch', color: ORANGE, size: 14,
      body: `FND only ${F('v1_heed_election_leach_join')} → ${F('v2_fairness_penalty')}.\n\nThe negotiation of HEED, paid every round, is the real problem — not fairness.` });
    lesson(s, 'remove the iterative negotiation.');
  }
  {
    const s = base(); title(s, 'v3 – v4: single-pass election + cluster reuse', 'The biggest jump of the whole study');
    eqBox(s, 'eq_score.png', 0.6, 1.45, 7.4, 1.05);
    s.addText('= LEACH rotation × energy × neighbours, in one step', { x: 8.2, y: 1.45, w: 4.5, h: 1.05, fontSize: 15, bold: true, color: NAVY, fontFace: BODY, valign: 'middle', margin: 0, isTextBox: true });
    singleBar(s, ['v2', 'v3 (reuse 5)', 'v4 (reuse 15)'], [F('v2_fairness_penalty'), F('v3_single_pass_reuse_int5'), F('v4_reuse_int15')], [GREY, AQUA, GREY], 0.6, 2.6, 6.4, 3.8, { name: 'FND', valAxisTitle: 'FND (rounds)', showValAxisTitle: true });
    card(s, 7.3, 2.6, 5.4, 3.8, { head: `×${(F('v3_single_pass_reuse_int5') / F('v2_fairness_penalty')).toFixed(1)} longer first-node life`, icon: 'FaBolt', color: AQUA, size: 14,
      body: `Clusters are kept for 5 rounds, so setup is paid once per 5 rounds.\n\n15 rounds is worse (${F('v4_reuse_int15')}, PDR ${C.pct(C.get('v4_reuse_int15').P)}): the CH is overloaded and its members are orphaned when it dies.` });
    lesson(s, 'reuse clusters for 5 rounds — but protect the members when the CH dies.');
  }
  {
    const s = base(); title(s, 'v5: backup CH', 'The strongest member replaces a dead CH (v5b: only if it has ≥ 5 % of E0)');
    const r = [['v4', 'v4_reuse_int15'], ['v5 (int 15)', 'v5_backup_int15'], ['v5-exp (int 5)', 'v5x_backup_repair_int5'], ['v5-exp (int 10)', 'v5x_backup_repair_int10'], ['v5b', 'v5b_energy_aware_repair']];
    tbl(s, [['Version', 'FND', 'HND', 'LND', 'PDR']].concat(r.map(([n, k]) => { const x = C.get(k); return [n, x.F, x.H, x.L, C.pct(x.P)]; })), 0.6, 1.5, 7.0, [2.2, 1.2, 1.2, 1.2, 1.2], { size: 14, rowH: 0.55, center: true, hlLast: true });
    card(s, 7.9, 1.5, 4.8, 4.6, { head: 'Result', icon: 'FaUserShield', color: BLUE, size: 14, body: 'The backup protects the data (PDR ↑) but does not delay the first death.\n\nInterval 5 is the best again.\n\nv5b becomes the base of v8.' });
    lesson(s, 'protection improves reliability; lifetime needs something else.');
  }
  {
    const s = base(); title(s, 'v6 – v7: chaining the cluster heads', 'CHs forward to each other towards the BS (idea from PEGASIS)');
    singleBar(s, ['v5b', 'v6 chain', 'v7 chain + backup', 'v7.1 multihop tree', 'v7.2 (int 10)'], [F('v5b_energy_aware_repair'), F('v6_chain_center'), F('v7_chain_backup_center'), F('v7_1_multihop_int5'), F('v7_2_multihop_int10')],
      [BLUE, GREY, GREY, GREY, GREY], 0.6, 1.5, 7.4, 4.8, { name: 'FND', valAxisTitle: 'FND (rounds)', showValAxisTitle: true, valAxisMinVal: 0, valAxisMaxVal: 2000 });
    card(s, 8.3, 1.5, 4.4, 4.8, { head: 'Worse, not better', icon: 'FaExclamationTriangle', color: RED, size: 14,
      body: 'CHs near the BS carry everybody\'s traffic and die first (the "hot spot" of EEUC [13]).\n\nWith the BS at the centre, forced relaying costs more than it saves.' });
    lesson(s, 'relay only when it really saves energy.');
  }
  {
    const s = base(); title(s, 'v8: five improvements on top of v5b');
    const m = [['I1 Epoch fix', 'start a new epoch when nobody is eligible → no round without CHs', 'FaSyncAlt', GREY],
      ['I2 Handover', 'a CH that cannot finish the round hands over before it dies', 'FaHandshake', GREY],
      ['I3 Re-join', 'members of a dead CH join the nearest alive CH', 'FaUsers', GREY],
      ['I4 Direct-to-BS', 'a node not farther from the BS than from its CH sends directly', 'FaRoute', ORANGE],
      ['I5 Energy gate', 'only nodes with E ≥ network average may become CH', 'FaBatteryQuarter', ORANGE]];
    m.forEach(([h, b, ic, col], i) => card(s, 0.6 + (i % 3) * 4.1, 1.5 + Math.floor(i / 3) * 2.4, 3.85, 2.2, { head: h, body: b, icon: ic, color: col, size: 13, headSize: 15 }));
    stat(s, 8.9, 3.95, 3.8, String(F('v8_center')), `FND (v5b ${F('v5b_energy_aware_repair')}) · PDR ${C.pct(C.get('v8_center').P)}`, BLUE);
  }
  {
    const s = base(); title(s, 'Ablation — which improvement matters?', 'v8 with one improvement switched off');
    const ab = [['v8 (full)', 'v8_center'], ['− I1 epoch fix', 'v8_without_I1'], ['− I2 handover', 'v8_without_I2'], ['− I3 re-join', 'v8_without_I3'], ['− I5 energy gate', 'v8_without_I5'], ['− I4 direct-to-BS', 'v8_without_I4']];
    s.addChart(pres.charts.BAR, [{ name: 'FND', labels: ab.map(a => a[0]), values: ab.map(a => F(a[1])) }], Object.assign(chartBase(), {
      x: 0.6, y: 1.5, w: 8.2, h: 5.4, barDir: 'bar', chartColors: [BLUE], showLegend: false, showValue: true, dataLabelPosition: 'outEnd', catAxisOrientation: 'maxMin', valAxisMinVal: 0, valAxisMaxVal: 3000 }));
    card(s, 9.1, 1.5, 3.6, 2.6, { head: 'I4 and I5 make the gain', icon: 'FaBolt', color: ORANGE, size: 13, body: `without I4: ${F('v8_without_I4')}\nwithout I5: ${F('v8_without_I5')}` });
    card(s, 9.1, 4.3, 3.6, 2.6, { head: 'I1, I2, I3 are safety nets', icon: 'FaShieldAlt', color: AQUA, size: 13, body: 'no zero-CH rounds, no lost members, stable PDR' });
  }
  {
    const s = base(); title(s, 'v8-Chain = v8 + energy-aware relay (for a far BS)', 'A CH forwards through another CH only if it is cheaper than going straight to the BS');
    eqBox(s, 'eq_relay.png', 0.6, 1.45, 12.1, 0.95);
    const lab = ['Direct (v8)', 'Ordered chain', 'Energy-aware relay'];
    for (const [i, bs, t] of [[0, 'center', 'BS at the centre'], [1, 'farBS', 'BS far away (50, −100)']]) {
      const x = 0.6 + i * 6.2;
      s.addText(t, { x, y: 2.5, w: 5.9, h: 0.4, fontSize: 15, bold: true, color: NAVY, fontFace: BODY, margin: 0, isTextBox: true });
      singleBar(s, lab, [0, 1, 2].map(m => F(`${bs}_mode${m}`)), [i ? ORANGE : BLUE], x, 2.9, 5.9, 3.4, { name: 'FND', valAxisMinVal: 0, valAxisMaxVal: 3000 });
    }
    band(s, `Centre: the relay is never cheaper, so v8-Chain = v8 (${v8m.F}).  Far BS: +${C.gain(v8cf.F, v8f.F).toFixed(0)} % FND (${v8f.F} → ${v8cf.F}) → use v8-Chain only when the BS is far.`, 6.45);
  }
  {
    const s = base(); title(s, 'Evolution — lifetime of all versions', 'FND / HND / LND · unified environment, BS at the centre');
    lifeChart(s, C.EVOLUTION.map(e => e[0]), C.EVOLUTION.map(e => e[1]), 0.6, 1.4, 12.1, 5.5, { showValue: false });
  }
  {
    const s = base(); title(s, 'Evolution — first node death', 'The two jumps: v3 and v8');
    const lab = C.EVOLUTION.map(e => e[0]); const vals = C.EVOLUTION.map(e => F(e[1]));
    singleBar(s, lab, vals, [BLUE], 0.6, 1.4, 12.1, 5.5, { name: 'FND', valAxisTitle: 'FND (rounds)', showValAxisTitle: true, valAxisTitleColor: MUTED });
  }
  {
    const s = base(); title(s, 'Evolution — packet delivery ratio', 'Reliability of every version');
    const lab = C.EVOLUTION.map(e => e[0]);
    singleBar(s, lab, C.EVOLUTION.map(e => +C.get(e[1]).P.toFixed(2)), [AQUA], 0.6, 1.4, 12.1, 4.9, { name: 'PDR (%)', valAxisMinVal: 95, valAxisMaxVal: 100, dataLabelFormatCode: '0.00',
      valAxisTitle: 'PDR (%)', showValAxisTitle: true, valAxisTitleColor: MUTED });
    band(s, `Reuse without protection loses data (v4 ${C.pct(C.get('v4_reuse_int15').P)}); backup, handover and re-join bring it back (v8-Chain ${C.pct(v8c.P)}).`, 6.4);
  }
  {
    const s = base(); title(s, 'Architecture of v8', 'Setup once every 5 rounds · data every round · fault tolerance · the relay box is added only in v8-Chain (far BS)');
    img(s, 'f12_architecture.png', 0.5, 1.45, 12.3, 5.5);
  }
  {
    const s = base(); title(s, 'The relay in action (v8-Chain)', 'Round 50 — centre: no relay is cheaper, all CHs send directly · far BS: CHs relay towards the BS');
    img(s, 'f11_topology_center.png', 0.6, 1.45, 5.6, 5.5); img(s, 'f11_topology_farBS.png', 6.4, 1.45, 6.3, 5.5);
  }
  {
    const s = base(); title(s, 'Final comparison — network lifetime (BS at the centre)', 'Best version of every family, unified environment');
    lifeChart(s, C.FAMILY.map(f => f[0]), C.FAMILY.map(f => f[1]), 0.6, 1.3, 8.0, 5.6, { showValue: false });
    stat(s, 8.9, 1.7, 3.8, String(v8m.F), 'v8: rounds before the first node dies — the latest of all', AQUA);
    stat(s, 8.9, 3.4, 3.8, '+' + C.gain(v8m.F, leach.F).toFixed(0) + '%', `FND vs LEACH (${leach.F})`, ORANGE);
    stat(s, 8.9, 5.1, 3.8, '+' + C.gain(v8m.F, best.F).toFixed(0) + '%', `FND vs the best hybrid (SH-LEACH+ ${best.F})`, BLUE);
  }
  {
    const s = base(); title(s, 'Alive nodes and energy per round', 'v8 (blue) keeps every node alive longest, then all die together');
    img(s, 'f3_alive_curves.png', 0.6, 1.45, 6.0, 5.4); img(s, 'f10_energy_curves.png', 6.8, 1.45, 6.0, 5.4);
  }
  {
    const s = base(); title(s, 'Reliability and robustness');
    const lab = C.FAMILY.map(f => f[0]); const vals = C.FAMILY.map(f => +C.get(f[1]).P.toFixed(2));
    singleBar(s, lab, vals, [BLUE], 0.6, 1.4, 6.3, 5.0, { name: 'PDR (%)', valAxisMinVal: 98.5, valAxisMaxVal: 100, dataLabelFormatCode: '0.00', catAxisLabelFontSize: 10 });
    img(s, 'f7_robustness.png', 7.1, 1.4, 5.7, 3.9);
    const r = C.robust('v8_center');
    s.addText(`8 random topologies: FND ${r.Fmin} – ${r.Fmax} (mean ${r.F.toFixed(0)})`, { x: 7.1, y: 5.4, w: 5.7, h: 0.8, fontSize: 15, bold: true, color: INK, fontFace: BODY, margin: 0, isTextBox: true });
    band(s, 'All protocols deliver > 99 % of readings; they differ in lifetime.  The v8 result is not luck of one layout.', 6.5);
  }
  {
    const s = base(); title(s, 'Summary of the comparison', 'Unified environment, BS at the centre');
    const rows = [['Protocol', 'Family', 'FND', 'HND', 'LND', 'PDR', 'v8 FND gain', 'FND far BS']];
    const list = [['LEACH', 'leach_EDITED', 'classic'], ['HEED', 'heed_EDITED', 'classic'], ['PEGASIS', 'pegasis_EDITED', 'classic'], ['SH-LEACH+', 'shleach_IMPROVED', 'hybrid, fixed'],
      ['H-LEACH+', 'hleach_IMPROVED', 'hybrid, fixed'], ['EECH-HEED+', 'eechheed_IMPROVED', 'recent hybrid, fixed'], ['v8', 'v8_center', 'proposed (main)'], ['v8-Chain', 'v8_chain_center', 'proposed (far BS)']];
    list.forEach(([n, run, fam]) => { const r = C.get(run); const far = run === 'v8_center' ? v8f.F : run === 'v8_chain_center' ? v8cf.F : FF(run);
      rows.push([n, fam, r.F, r.H, r.L, C.pct(r.P), run.startsWith('v8') ? '—' : '+' + C.gain(v8m.F, r.F).toFixed(0) + '%', far]); });
    tbl(s, rows, 0.6, 1.45, 12.1, [1.7, 2.6, 1.1, 1.1, 1.1, 1.3, 1.5, 1.7], { size: 13, rowH: 0.52, center: true, centerFrom: 2, hl: i => i >= 7 });
    band(s, `Centre: v8 has the latest first death (+${C.gain(v8m.F, best.F).toFixed(0)} % to +${C.gain(v8m.F, heed.F).toFixed(0)} %).  Far BS: v8-Chain is the best (${v8cf.F}).`, 6.35);
  }
  {
    const s = base(); title(s, 'When the BS is far away — all protocols', 'BS at (50, −100): grey = centre, orange / blue = far');
    img(s, 'far_fnd.png', 0.6, 1.45, 12.1, 4.7);
    band(s, `Far BS: v8 alone reaches ${v8f.F}, close to EECH-HEED+ (${FF('eechheed_IMPROVED')}); v8-Chain reaches ${v8cf.F} — the best of all.`, 6.3);
  }
  {
    const s = base(); title(s, 'Far BS — ranking', 'First node death with the BS at (50, −100)');
    img(s, 'far_rank.png', 0.6, 1.45, 7.4, 5.3);
    card(s, 8.3, 1.5, 4.4, 5.2, { head: 'Why v8-Chain here', icon: 'FaRoute', color: BLUE, size: 14,
      body: `With a far BS every CH → BS packet costs d⁴.\n\nThe relay lets a CH hand its packet to a CH nearer the BS when that is cheaper.\n\n+${C.gain(v8cf.F, v8f.F).toFixed(0)} % over v8, +${C.gain(v8cf.F, FF('eechheed_IMPROVED')).toFixed(0)} % over the best other protocol (EECH-HEED+), +${C.gain(v8cf.F, FF('leach_EDITED')).toFixed(0)} % over LEACH.` });
  }
  {
    const s = base(); title(s, 'Which version we chose — and why', 'v8 is the main protocol · v8-Chain = v8 + relay, used only when the BS is far');
    const w = [['v8: latest first death', `FND ${v8m.F} with the BS at the centre — highest of all protocols`, 'FaTrophy', BLUE],
      ['v8-Chain: for a far BS', `adds the energy-aware relay: ${v8f.F} → ${v8cf.F} (+${C.gain(v8cf.F, v8f.F).toFixed(0)} %) when the BS is far; no change at the centre`, 'FaMapMarkedAlt', ORANGE],
      ['Reliable', `PDR ${C.pct(v8m.P)}; no round without CHs; members never orphaned`, 'FaCheckCircle', AQUA],
      ['Stable', `8 topologies: FND ${C.robust('v8_center').Fmin} – ${C.robust('v8_center').Fmax}`, 'FaBalanceScale', NAVY],
      ['Lightweight and distributed', 'one-step score, local decisions, no training', 'FaLeaf', AQUA],
      ['Each part justified', 'every mechanism kept only if the ablation shows it helps', 'FaSearch', GREY]];
    w.forEach(([h, b, ic, col], i) => card(s, 0.6 + (i % 3) * 4.1, 1.5 + Math.floor(i / 3) * 2.7, 3.85, 2.45, { head: h, body: b, icon: ic, color: col, size: 16, headSize: 16 }));
  }

  // ================= 07 CONCLUSION =================
  section('07', 'Conclusion', 'Limitations, summary and references');
  {
    const s = base(); title(s, 'Limitations');
    const L = [['Analytical energy model', 'Long runs use the first-order radio model: no collisions, retransmissions or fading (the demo shows packet level on a small scale).', 'FaMicrochip'],
      ['Static, equal nodes', '100 static nodes with equal energy; no mobility or heterogeneous hardware.', 'FaMapMarkedAlt'],
      ['One field size', '100 × 100 m and 100 nodes; larger networks not tested.', 'FaThLarge'],
      ['Uniform random deployment only', `8 random topologies tested (v8 FND ${C.robust('v8_center').Fmin} – ${C.robust('v8_center').Fmax}); uneven or clustered layouts not tested.`, 'FaRandom'],
      ['Missing paper details', 'Some settings (packet size, sensor signal) had to be assumed and documented.', 'FaBook'],
      ['PEGASIS keeps a longer LND', `${peg.L} vs ${v8m.L}: v8 is designed for the first death, not the last.`, 'FaStream']];
    L.forEach(([h, b, ic], i) => card(s, 0.6 + (i % 2) * 6.15, 1.45 + Math.floor(i / 2) * 1.85, 5.95, 1.65, { head: h, body: b, icon: ic, color: GREY, size: 12.5, headSize: 15 }));
  }
  {
    const s = base(NAVY);
    s.addText('Summary', { x: 0.8, y: 0.5, w: 11, h: 0.9, fontSize: 38, bold: true, color: 'FFFFFF', fontFace: HEAD, margin: 0, isTextBox: true });
    const k = [[String(v8m.F), 'v8: rounds before the first node dies'], ['+' + C.gain(v8m.F, best.F).toFixed(0) + '%', 'over the best fixed hybrid'], [String(v8cf.F), 'v8-Chain with a far BS (best of all)']];
    k.forEach(([b, l], i) => { s.addText(b, { x: 0.8 + i * 4.1, y: 1.6, w: 3.8, h: 1.1, fontSize: 48, bold: true, color: [BLUE, ORANGE, AQUA][i], fontFace: HEAD, margin: 0, isTextBox: true });
      s.addText(l, { x: 0.8 + i * 4.1, y: 2.7, w: 3.7, h: 0.6, fontSize: 15, color: 'C9D4E8', fontFace: BODY, margin: 0, valign: 'top', isTextBox: true }); });
    bullets(s, ['Six protocols reproduced and validated against their papers, then compared in one fair environment.',
      'Flaws found and fixed in three hybrids: all of them had broken LEACH\'s rotation.',
      'v8 built step by step: single-pass election, cluster reuse, CH protection, direct-to-BS and energy gate — the main protocol.',
      `v8-Chain adds an energy-aware relay: same as v8 at the centre, +${C.gain(v8cf.F, v8f.F).toFixed(0)} % when the BS is far.`,
      `Stable on 8 random topologies (v8 FND ${C.robust('v8_center').Fmin} – ${C.robust('v8_center').Fmax}) and better than every other protocol with the BS far away.`], 0.8, 3.6, 11.7, 3.4, 16, 'FFFFFF');
  }
  for (const part of [[0, 9], [9, C.REFS.length]]) {
    const s = base(); title(s, 'References' + (part[0] ? ' (continued)' : ''));
    s.addText(C.REFS.slice(part[0], part[1]).map((r, i) => ({ text: `[${part[0] + i + 1}]  ${r}`, options: { breakLine: i < part[1] - part[0] - 1 } })),
      { x: 0.6, y: 1.3, w: 12.1, h: 5.8, fontSize: 13.5, color: INK, fontFace: BODY, valign: 'top', margin: 0, paraSpaceAfter: 10, isTextBox: true });
  }
  {
    const s = base(NAVY);
    circleIcon(s, 'FaLeaf', 6.17, 1.4, 1.0, AQUA);
    s.addText('Thank you', { x: 0.8, y: 2.7, w: 11.7, h: 1.2, fontSize: 50, bold: true, color: 'FFFFFF', fontFace: HEAD, align: 'center', margin: 0, isTextBox: true });
    s.addText('Special thanks to my supervisors Dr. Hesham ElZouka, Dr. Amani Saad and Dr. Khaled Saada', { x: 0.8, y: 3.95, w: 11.7, h: 0.6, fontSize: 18, color: 'C9D4E8', fontFace: BODY, align: 'center', margin: 0, isTextBox: true });
    s.addText('Questions and discussion', { x: 0.8, y: 4.7, w: 11.7, h: 0.6, fontSize: 20, color: 'FFFFFF', fontFace: BODY, align: 'center', margin: 0, isTextBox: true });
    s.addText('Code, results and papers: GitHub', { x: 0.8, y: 5.9, w: 11.7, h: 0.5, fontSize: 14, color: 'C9D4E8', fontFace: BODY, align: 'center', margin: 0, isTextBox: true });
  }

  await pres.writeFile({ fileName: OUT });
  console.log('written', OUT, pageNo, 'slides');
}
build().catch(e => { console.error(e); process.exit(1); });
