import { jsPDF } from "jspdf";
import type { AttendeeRow } from "@/lib/api";

export function generateAttendeePdfBase64(rows: AttendeeRow[], title: string): string {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginBottom = 50;
  let y = 50;

  const colX = { name: 40, phone: 190, ref: 300, tier: 380, event: 470 };

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 40, y);
    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`${rows.length} attendee${rows.length !== 1 ? "s" : ""} \u00b7 generated ${new Date().toLocaleString()}`, 40, y);
    y += 24;
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Name", colX.name, y);
    doc.text("Phone", colX.phone, y);
    doc.text("Ticket Ref", colX.ref, y);
    doc.text("Tier", colX.tier, y);
    doc.text("Event", colX.event, y);
    y += 6;
    doc.setLineWidth(0.5);
    doc.line(40, y, 555, y);
    y += 14;
    doc.setFont("helvetica", "normal");
  };

  drawHeader();

  rows.forEach((r) => {
    if (y > pageHeight - marginBottom) {
      doc.addPage();
      y = 50;
      drawHeader();
    }
    doc.text(r.name.slice(0, 22), colX.name, y);
    doc.text(r.phone.slice(0, 16), colX.phone, y);
    doc.text(r.ticket_ref, colX.ref, y);
    doc.text(r.tier_name.slice(0, 12), colX.tier, y);
    doc.text(r.event_title.slice(0, 14), colX.event, y);
    y += 16;
  });

  return doc.output("datauristring").split(",")[1];
}
