import type { jsPDF } from "jspdf";

export interface PdfSection {
  heading: string;
  /** Short text shown on the right of the heading, e.g. total hours. */
  total: string;
  rows: (string | number)[][];
}

export interface PdfReport {
  filename: string;
  title: string;
  subtitle?: string;
  /** Active filters, printed under the title. */
  filters?: string[];
  /** Key figures shown as boxes above the tables. */
  summary: { label: string; value: string }[];
  columns: string[];
  /** Column indexes (0-based) to right-align, e.g. hours. */
  numericColumns?: number[];
  sections: PdfSection[];
}

const GREEN: [number, number, number] = [22, 101, 52];
const INK: [number, number, number] = [31, 41, 36];
const MUTED: [number, number, number] = [107, 114, 110];
const TINT: [number, number, number] = [236, 245, 238];

async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch("/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadPdf(report: PdfReport): Promise<void> {
  const [{ jsPDF: PDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc: jsPDF = new PDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const generated = new Date().toLocaleString("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const logo = await loadLogo();
  let y = margin;
  if (logo) {
    const height = 30;
    const props = doc.getImageProperties(logo);
    doc.addImage(logo, "PNG", margin, y - 6, (props.width / props.height) * height, height);
  }
  doc.setTextColor(...MUTED).setFont("helvetica", "normal").setFontSize(9);
  doc.text(`Generato il ${generated}`, pageWidth - margin, y + 4, { align: "right" });

  y += 40;
  doc.setTextColor(...INK).setFont("helvetica", "bold").setFontSize(20);
  doc.text(report.title, margin, y);
  if (report.subtitle) {
    y += 18;
    doc.setTextColor(...MUTED).setFont("helvetica", "normal").setFontSize(11);
    doc.text(report.subtitle, margin, y);
  }
  if (report.filters?.length) {
    y += 15;
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(report.filters.join("  ·  "), pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += (lines.length - 1) * 11;
  }

  y += 16;
  const gap = 10;
  const boxWidth = Math.min(180, (pageWidth - margin * 2 - gap * (report.summary.length - 1)) / report.summary.length);
  report.summary.forEach((item, index) => {
    const x = margin + index * (boxWidth + gap);
    doc.setFillColor(...TINT).roundedRect(x, y, boxWidth, 44, 5, 5, "F");
    doc.setTextColor(...MUTED).setFont("helvetica", "normal").setFontSize(8);
    doc.text(item.label.toUpperCase(), x + 10, y + 15);
    doc.setTextColor(...GREEN).setFont("helvetica", "bold").setFontSize(15);
    doc.text(item.value, x + 10, y + 35);
  });
  y += 44 + 18;

  const alignRight = Object.fromEntries(
    (report.numericColumns ?? []).map((index) => [index, { halign: "right" as const }]),
  );
  const columnCount = report.columns.length;

  for (const section of report.sections) {
    if (y > pageHeight - 90) {
      doc.addPage();
      y = margin;
    }
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 40 },
      head: [
        [
          {
            content: section.heading,
            colSpan: columnCount - 2,
            styles: { halign: "left", fillColor: GREEN, textColor: 255, fontSize: 10 },
          },
          {
            content: section.total,
            colSpan: 2,
            styles: { halign: "right", fillColor: GREEN, textColor: 255, fontSize: 10 },
          },
        ],
        report.columns.map((column, index) => ({
          content: column,
          styles: {
            halign: report.numericColumns?.includes(index) ? ("right" as const) : ("left" as const),
            fillColor: TINT,
            textColor: INK,
          },
        })),
      ],
      body: section.rows.map((row) => row.map(String)),
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, textColor: INK, overflow: "linebreak" },
      alternateRowStyles: { fillColor: [248, 250, 249] },
      columnStyles: alignRight,
      showHead: "everyPage",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setTextColor(...MUTED).setFont("helvetica", "normal").setFontSize(8);
    doc.text("Ocima Ore", margin, pageHeight - 20);
    doc.text(`Pagina ${page} di ${pages}`, pageWidth - margin, pageHeight - 20, { align: "right" });
  }

  doc.save(report.filename);
}
