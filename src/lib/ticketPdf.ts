import { jsPDF } from "jspdf";

export interface TicketPdfData {
  title: string;
  venue: string;
  city: string;
  dateLabel: string;
  qrDataUrl: string;
  qrCode: string;
}

/** Builds a simple ticket PDF and returns it as base64 (no data: prefix),
 * ready to either trigger a browser download or write to the native filesystem. */
export function generateTicketPdfBase64(data: TicketPdfData): string {
  const doc = new jsPDF({ unit: "pt", format: [320, 480] });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.title, 160, 40, { align: "center", maxWidth: 280 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${data.venue}, ${data.city}`, 160, 65, { align: "center" });
  if (data.dateLabel) doc.text(data.dateLabel, 160, 82, { align: "center" });

  if (data.qrDataUrl) {
    doc.addImage(data.qrDataUrl, "PNG", 60, 100, 200, 200);
  }

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(data.qrCode, 160, 320, { align: "center", maxWidth: 280 });

  return doc.output("datauristring").split(",")[1];
}
