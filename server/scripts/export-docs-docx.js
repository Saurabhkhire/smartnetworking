/**
 * Builds a combined Word (.docx) from markdown files in /docs.
 * Run: npm run docs:word --prefix server   (from repo root)
 */
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'generated');

const FILES = [
  'docs/VENTUREGRAPH_FULL_DOC.md',
  'docs/ARCHITECTURE.md',
  'docs/ALGORITHM.md',
  'docs/LLM_AI_WORKFLOW.md',
  'docs/NEO4J_FLOW.md',
];

function stripMd(s) {
  return String(s)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .trim();
}

function linesToParagraphs(text) {
  const out = [];
  const lines = text.split('\n');
  for (let line of lines) {
    line = line.trimEnd();
    if (!line.trim()) continue;
    const t = stripMd(line);
    if (!t) continue;
    if (t.startsWith('# ')) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t.slice(2))] }));
    } else if (t.startsWith('## ')) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t.slice(3))] }));
    } else if (t.startsWith('### ')) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t.slice(4))] }));
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      out.push(new Paragraph({ children: [new TextRun('• ' + t.slice(2))] }));
    } else if (/^\d+\.\s/.test(t)) {
      out.push(new Paragraph({ children: [new TextRun(t)] }));
    } else {
      out.push(new Paragraph({ children: [new TextRun(t)] }));
    }
  }
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const children = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun('Smart Networking — Algorithm & AI Documentation')],
    }),
    new Paragraph({
      children: [new TextRun(`Generated ${new Date().toISOString().slice(0, 10)} — see source .md files in /docs for updates.`)],
    })
  );

  for (const rel of FILES) {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) {
      console.warn('Skip missing file:', rel);
      continue;
    }
    const raw = fs.readFileSync(fp, 'utf8');
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(`— ${rel} —`)],
      })
    );
    children.push(...linesToParagraphs(raw));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const outPath = path.join(OUT_DIR, 'SmartNetworking_Algorithm_and_AI.docx');
  fs.writeFileSync(outPath, buf);
  console.log('Wrote', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
