// Small helper layer over the docx library, shared by the report builders.
const fs = require('fs');
const path = require('path');
const D = require('docx');
const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, HeadingLevel, ImageRun,
  BorderStyle, LevelFormat, Footer, Header, PageNumber, TableOfContents, PageBreak } = D;

const FIG = path.join(__dirname, 'fig');
const NAVY = '14213D', MUTED = '5F5E5A', LINE = 'D9D8D2', TINT = 'F3F6FB', BLUE = '2A78D6';
const PAGE_W = 11906, MARGIN = 1134;               // A4, 2 cm margins
const TEXT_W = PAGE_W - 2 * MARGIN;                // 9638 DXA

const runs = t => (Array.isArray(t) ? t : [t]).map(x => typeof x === 'string' ? new TextRun(x) : new TextRun(x));
const P = (t, o = {}) => new Paragraph(Object.assign({ children: runs(t), spacing: { after: 120, line: 300 } }, o));
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: false });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t, level = 0) => new Paragraph({ numbering: { reference: 'bullets', level }, children: runs(t), spacing: { after: 60, line: 290 } });
const N = t => new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: runs(t), spacing: { after: 60, line: 290 } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const eq = t => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 },
  children: [new TextRun({ text: t, font: 'Cambria Math', size: 22 })] });

function caption(t) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 },
    children: [new TextRun({ text: t, italics: true, size: 18, color: MUTED })] });
}
function img(file, widthIn, cap) {
  const f = path.join(FIG, file);
  const buf = fs.readFileSync(f);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);         // PNG header
  const W = Math.round(widthIn * 96), H = Math.round(W * h / w);
  const out = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, keepNext: true,
    children: [new ImageRun({ type: 'png', data: buf, transformation: { width: W, height: H },
      altText: { title: cap || file, description: cap || file, name: file } })] })];
  if (cap) out.push(caption(cap));
  return out;
}
function table(head, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (t, i, j, isHead) => new TableCell({
    width: { size: widths[j], type: WidthType.DXA }, borders,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: isHead ? NAVY : (opts.hl && opts.hl(i) ? 'DCE9FA' : (i % 2 ? TINT : 'FFFFFF')) },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: (j > 0 && opts.center && opts.center(j)) ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(t), bold: isHead || (opts.hl && opts.hl(i)), color: isHead ? 'FFFFFF' : '1F1F1D', size: opts.size || 18 })] })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: (head.every(h => h === '') ? [] : [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((t, j) => cell(t, -1, j, true)) })])
      .concat(rows.map((r, i) => new TableRow({ cantSplit: true, children: r.map((t, j) => cell(t, i, j, false)) }))),
  });
}
function callout(title, lines) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFD4F2' };
  return new Table({ width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: [TEXT_W], rows: [new TableRow({ children: [new TableCell({
    width: { size: TEXT_W, type: WidthType.DXA }, borders: { top: border, bottom: border, left: border, right: border },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EEF4FC' }, margins: { top: 120, bottom: 120, left: 180, right: 180 },
    children: [new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: title, bold: true, color: NAVY })] })]
      .concat(lines.map(l => new Paragraph({ spacing: { after: 60 }, children: runs(l) }))) })] })] });
}
const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] });

function doc(title, children, { headerText } = {}) {
  return new D.Document({
    creator: 'Rahma Khaled Oshba', title,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: 'Cambria', size: 34, bold: true, color: NAVY }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: 'Cambria', size: 27, bold: true, color: NAVY }, paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: 'Calibri', size: 23, bold: true, color: BLUE }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
      ],
    },
    numbering: { config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 260 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ] },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: headerText || title, size: 16, color: MUTED })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTED })] })] }) },
      children,
    }],
  });
}
function titlePage(title, subtitle, lines, contents) {
  const toc = (contents || []).map(t => new Paragraph({ spacing: { after: 90 }, indent: { left: /^\d+\.\d/.test(t) ? 400 : 0 },
    children: [new TextRun({ text: t, size: /^\d+\.\d/.test(t) ? 21 : 23, bold: !/^\d+\.\d/.test(t), color: /^\d+\.\d/.test(t) ? MUTED : NAVY })] }));
  return [
    new Paragraph({ spacing: { before: 2400, after: 240 }, children: [new TextRun({ text: title, font: 'Cambria', size: 52, bold: true, color: NAVY })] }),
    new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: subtitle, size: 28, italics: true, color: MUTED })] }),
    ...lines.map(l => new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: l, size: 24 })] })),
    pageBreak(),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Contents', font: 'Cambria', size: 34, bold: true, color: NAVY })] }),
    ...toc,
    pageBreak(),
  ];
}
async function save(d, file) {
  const buf = await D.Packer.toBuffer(d);
  fs.writeFileSync(file, buf);
  console.log('written', file);
}
module.exports = { P, H1, H2, H3, B, N, eq, img, table, callout, caption, spacer, pageBreak, doc, titlePage, save, TEXT_W, TextRun };
