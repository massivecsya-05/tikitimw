import { jsPDF } from "jspdf";

export function generateApplicationPdfBase64(app: any): string {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 50;

  const line = (label: string, value?: string | null) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, 40, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "\u2014", 220, y, { maxWidth: 330 });
    y += 22;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TikitiMW Vendor Application", 40, y);
  y += 30;

  line("Status", app.status);
  line("Submitted", new Date(app.created_at).toLocaleString());
  line("Business name", app.business_name);
  line("Business type", app.business_type);
  line("Registration #", app.registration_number);
  line("Tax ID", app.tax_id);
  line("Contact name", app.contact_name);
  line("Contact phone", app.contact_phone);
  line("Contact email", app.contact_email);
  line("City", app.city);
  line("Address", app.address);
  line("Event types", app.event_types);
  line("Website / social", app.website_or_social);
  line("ID document type", app.id_document_type);
  line("ID number", app.id_number);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Description", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  const desc = doc.splitTextToSize(app.description || "", 510);
  doc.text(desc, 40, y);
  y += desc.length * 14 + 20;

  if (app.reviewed_at) line("Reviewed at", new Date(app.reviewed_at).toLocaleString());
  if (app.note) line("Admin note", app.note);

  return doc.output("datauristring").split(",")[1];
}
