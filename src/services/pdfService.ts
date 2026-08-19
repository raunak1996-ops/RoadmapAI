import type { jsPDF } from 'jspdf';
import type {
  CustomerIssue,
  FeatureIdea,
  InsightsData,
  Ticket,
  TicketStatus,
} from '../types';
import { DEFAULT_CONFIDENCE, formatDate, ticketProgress } from '../lib/utils';

/**
 * Hand-rolled layout rather than a table plugin: the report is a fixed set of
 * sections, and owning the cursor keeps page breaks predictable.
 */

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

const INK = { r: 15, g: 23, b: 42 };
const MUTED = { r: 100, g: 116, b: 139 };
const BRAND = { r: 79, g: 70, b: 229 };
const RULE = { r: 226, g: 232, b: 240 };

const STATUS_ORDER: TicketStatus[] = ['In Progress', 'Todo', 'Backlog', 'Done'];

export interface ReportInput {
  tickets: Ticket[];
  ideas: FeatureIdea[];
  issues: CustomerIssue[];
  insights: InsightsData | null;
  generatedBy?: string;
}

class Cursor {
  y = MARGIN;
  page = 1;
  constructor(private doc: jsPDF) {}

  need(space: number): void {
    if (this.y + space <= PAGE.height - MARGIN - 24) return;
    this.doc.addPage();
    this.page += 1;
    this.y = MARGIN;
  }

  advance(amount: number): void {
    this.y += amount;
  }
}

function setColor(doc: jsPDF, c: { r: number; g: number; b: number }): void {
  doc.setTextColor(c.r, c.g, c.b);
}

function heading(doc: jsPDF, cur: Cursor, text: string): void {
  cur.need(44);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setColor(doc, INK);
  doc.text(text, MARGIN, cur.y);
  cur.advance(8);
  doc.setDrawColor(RULE.r, RULE.g, RULE.b);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, cur.y, MARGIN + CONTENT_WIDTH, cur.y);
  cur.advance(18);
}

function paragraph(doc: jsPDF, cur: Cursor, text: string, size = 9.5): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  setColor(doc, INK);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
  for (const line of lines) {
    cur.need(14);
    doc.text(line, MARGIN, cur.y);
    cur.advance(size * 1.45);
  }
  cur.advance(6);
}

function bullets(doc: jsPDF, cur: Cursor, items: string[]): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  for (const item of items) {
    const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 14) as string[];
    lines.forEach((line, index) => {
      cur.need(14);
      setColor(doc, index === 0 ? BRAND : INK);
      if (index === 0) doc.text('•', MARGIN, cur.y);
      setColor(doc, INK);
      doc.text(line, MARGIN + 14, cur.y);
      cur.advance(13.5);
    });
    cur.advance(3);
  }
  cur.advance(4);
}

function kpiRow(doc: jsPDF, cur: Cursor, cells: Array<{ label: string; value: string }>): void {
  cur.need(64);
  const gap = 10;
  const boxWidth = (CONTENT_WIDTH - gap * (cells.length - 1)) / cells.length;
  cells.forEach((cell, index) => {
    const x = MARGIN + index * (boxWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(RULE.r, RULE.g, RULE.b);
    doc.roundedRect(x, cur.y, boxWidth, 48, 5, 5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setColor(doc, BRAND);
    doc.text(cell.value, x + 10, cur.y + 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(doc, MUTED);
    doc.text(cell.label.toUpperCase(), x + 10, cur.y + 38);
  });
  cur.advance(64);
}

function tableHeader(doc: jsPDF, cur: Cursor, cols: string[], widths: number[]): void {
  cur.need(24);
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, cur.y - 10, CONTENT_WIDTH, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setColor(doc, MUTED);
  let x = MARGIN + 6;
  cols.forEach((col, index) => {
    doc.text(col.toUpperCase(), x, cur.y + 2);
    x += widths[index];
  });
  cur.advance(18);
}

function tableRow(doc: jsPDF, cur: Cursor, cells: string[], widths: number[]): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, INK);

  const wrapped = cells.map((cell, index) =>
    doc.splitTextToSize(cell, widths[index] - 10) as string[],
  );
  const height = Math.max(...wrapped.map((lines) => lines.length)) * 11 + 8;
  cur.need(height + 6);

  let x = MARGIN + 6;
  wrapped.forEach((lines, index) => {
    lines.forEach((line, lineIndex) => {
      doc.text(line, x, cur.y + 2 + lineIndex * 11);
    });
    x += widths[index];
  });

  cur.advance(height);
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, cur.y - 4, MARGIN + CONTENT_WIDTH, cur.y - 4);
}

function coverBlock(doc: jsPDF, cur: Cursor, generatedBy: string): void {
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, PAGE.width, 108, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Roadmap Status Report', MARGIN, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(224, 231, 255);
  doc.text('RoadmapAI  —  Product Roadmap & Customer Intelligence', MARGIN, 72);
  doc.setFontSize(8.5);
  doc.text(
    `Generated ${new Date().toLocaleString()}  •  Synthesis: ${generatedBy}`,
    MARGIN,
    88,
  );

  cur.y = 140;
}

function footer(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(doc, MUTED);
    doc.text('RoadmapAI status report', MARGIN, PAGE.height - 24);
    doc.text(`Page ${page} of ${pageCount}`, PAGE.width - MARGIN, PAGE.height - 24, {
      align: 'right',
    });
  }
}

export async function generateStatusReport(input: ReportInput): Promise<string> {
  const { tickets, ideas, issues, insights } = input;

  // jsPDF (plus its html2canvas/dompurify deps) is ~380kB and is only needed
  // the moment someone asks for a report, so it stays out of the entry chunk.
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  const cur = new Cursor(doc);

  const generatedBy =
    input.generatedBy ?? (insights?.generatedBy === 'gemini' ? 'Gemini' : 'Local model');

  coverBlock(doc, cur, generatedBy);

  const done = tickets.filter((t) => t.status === 'Done').length;
  const active = tickets.filter((t) => t.status === 'In Progress').length;
  const approvedIdeas = ideas.filter((i) => i.status === 'Approved').length;
  const openSignals = issues.filter((i) => i.status !== 'Approved').length;

  kpiRow(doc, cur, [
    { label: 'Tickets', value: String(tickets.length) },
    { label: 'In flight', value: String(active) },
    { label: 'Shipped', value: String(done) },
    { label: 'Approved ideas', value: String(approvedIdeas) },
    { label: 'Open signals', value: String(openSignals) },
  ]);

  heading(doc, cur, 'Executive summary');
  paragraph(
    doc,
    cur,
    insights?.summary ??
      'No AI synthesis has been run for this reporting period. Run the strategic synthesis on the Insights tab to populate this section.',
  );

  if (insights?.recommendations?.length) {
    heading(doc, cur, 'Recommended next steps');
    bullets(doc, cur, insights.recommendations);
  }

  if (insights?.risks?.length) {
    heading(doc, cur, 'Risks if we do not act');
    bullets(doc, cur, insights.risks);
  }

  heading(doc, cur, 'Execution status');
  const widths = [148, 74, 92, 68, 76];
  tableHeader(doc, cur, ['Ticket', 'Status', 'Assignee', 'Progress', 'Target'], widths);

  const ordered = [...tickets].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
  for (const ticket of ordered) {
    tableRow(
      doc,
      cur,
      [
        `${ticket.id}  ${ticket.title}`,
        ticket.status,
        ticket.assignee,
        `${ticketProgress(ticket)}%`,
        formatDate(ticket.endDate),
      ],
      widths,
    );
  }
  cur.advance(10);

  if (insights?.topThemes?.length) {
    heading(doc, cur, 'Customer themes driving the roadmap');
    const themeWidths = [268, 96, 134];
    tableHeader(doc, cur, ['Theme', 'Signals', 'Avg intensity'], themeWidths);
    for (const theme of insights.topThemes) {
      tableRow(doc, cur, [theme.theme, String(theme.count), `${theme.intensity} / 100`], themeWidths);
    }
    cur.advance(10);
  }

  const ranked = [...ideas].sort((a, b) => b.score - a.score).slice(0, 8);
  if (ranked.length) {
    heading(doc, cur, 'Top RICE-scored opportunities');
    const ideaWidths = [190, 56, 56, 66, 56, 74];
    tableHeader(doc, cur, ['Feature', 'Reach', 'Impact', 'Conf', 'Effort', 'RICE'], ideaWidths);
    for (const idea of ranked) {
      tableRow(
        doc,
        cur,
        [
          idea.title,
          String(idea.reach),
          String(idea.impact),
          `${Math.round((idea.confidence ?? DEFAULT_CONFIDENCE) * 100)}%`,
          String(idea.effort),
          idea.score.toFixed(1),
        ],
        ideaWidths,
      );
    }
    cur.advance(10);
  }

  const recentlySynced = tickets.filter((t) => t.recentActivity).slice(0, 8);
  if (recentlySynced.length) {
    heading(doc, cur, 'Recent activity from connected tools');
    bullets(
      doc,
      cur,
      recentlySynced.map(
        (t) => `${t.id} — [${t.updatedBy ?? 'Manual'}] ${t.recentActivity ?? ''}`,
      ),
    );
  }

  footer(doc);

  const filename = `RoadmapAI-Status-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
