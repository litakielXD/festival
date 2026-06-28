"use client";

interface NoteExportRow {
  dayLabel: string;
  bandName: string;
  authorName: string;
  content: string;
}

interface NotesPdfDownloadButtonProps {
  filename: string;
  title: string;
  rows: NoteExportRow[];
}

export function NotesPdfDownloadButton({ filename, title, rows }: NotesPdfDownloadButtonProps) {
  async function handleDownload() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 40;
    const right = pageWidth - 40;
    const tableWidth = right - left;
    const colDay = 120;
    const colBand = 130;
    const colAuthor = 95;
    const colNote = tableWidth - colDay - colBand - colAuthor;
    const topY = 50;
    const headerTop = 88;
    const rowPadY = 6;
    const lineHeight = 12;
    const bottomMargin = 44;
    let y = headerTop;
    let hasStartedPage = false;

    const drawPageTitle = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(title, left, topY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Erstellt am ${new Date().toLocaleDateString("de-DE")}`, left, topY + 16);
    };

    const drawTableHeader = () => {
      doc.setFillColor(243, 244, 246);
      doc.rect(left, y, tableWidth, 22, "F");
      doc.setDrawColor(200, 205, 214);
      doc.rect(left, y, tableWidth, 22);
      doc.line(left + colDay, y, left + colDay, y + 22);
      doc.line(left + colDay + colBand, y, left + colDay + colBand, y + 22);
      doc.line(left + colDay + colBand + colAuthor, y, left + colDay + colBand + colAuthor, y + 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Spieltag", left + 6, y + 14);
      doc.text("Band", left + colDay + 6, y + 14);
      doc.text("Autor", left + colDay + colBand + 6, y + 14);
      doc.text("Hausaufgabe", left + colDay + colBand + colAuthor + 6, y + 14);
      y += 22;
    };

    const startNewPage = () => {
      if (hasStartedPage) {
        doc.addPage();
      }
      hasStartedPage = true;
      y = headerTop;
      drawPageTitle();
      drawTableHeader();
    };

    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - bottomMargin) {
        startNewPage();
      }
    };

    if (!rows.length) {
      drawPageTitle();
      doc.text("Keine Hausaufgaben in der aktuellen Ansicht vorhanden.", left, y);
      doc.save(filename);
      return;
    }

    startNewPage();

    for (const row of rows) {
      doc.setFont("helvetica", "normal");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const dayLines = doc.splitTextToSize(row.dayLabel, colDay - 12) as string[];
      const bandLines = doc.splitTextToSize(row.bandName, colBand - 12) as string[];
      const authorLines = doc.splitTextToSize(row.authorName, colAuthor - 12) as string[];
      const noteLines = doc.splitTextToSize(row.content, colNote - 12) as string[];
      const maxLines = Math.max(dayLines.length, bandLines.length, authorLines.length, noteLines.length, 1);
      const rowHeight = maxLines * lineHeight + rowPadY * 2;

      ensureSpace(rowHeight);

      doc.setDrawColor(210, 214, 220);
      doc.rect(left, y, tableWidth, rowHeight);
      doc.line(left + colDay, y, left + colDay, y + rowHeight);
      doc.line(left + colDay + colBand, y, left + colDay + colBand, y + rowHeight);
      doc.line(left + colDay + colBand + colAuthor, y, left + colDay + colBand + colAuthor, y + rowHeight);

      const textY = y + rowPadY + 9;
      doc.text(dayLines, left + 6, textY);
      doc.text(bandLines, left + colDay + 6, textY);
      doc.text(authorLines, left + colDay + colBand + 6, textY);
      doc.text(noteLines, left + colDay + colBand + colAuthor + 6, textY);
      y += rowHeight;
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Seite ${i} / ${totalPages}`, right, pageHeight - 20, { align: "right" });
    }

    doc.save(filename);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      Aktuelle Ansicht als PDF
    </button>
  );
}
