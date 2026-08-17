import PDFDocument from "pdfkit";
import { Quote } from "./schemas.js";

export function quotePdf(quote: Quote, reference: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 }); const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const total = quote.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    doc.fillColor("#182438").fontSize(22).text(quote.businessName).fontSize(10).fillColor("#526071").text("DEMO / PRO FORMA - requires business approval before sending");
    doc.moveDown().fillColor("#182438").fontSize(16).text("Quote draft");
    doc.fontSize(10).text(`Reference: ${reference}`).text(`Prepared: ${new Date().toLocaleDateString("en-GB")}`).text(`For: ${quote.customerName}`);
    doc.moveDown().fontSize(11).text("Scope").fontSize(10).text(quote.jobDescription);
    doc.moveDown().fontSize(11).text("Items");
    quote.lineItems.forEach((item) => doc.fontSize(10).text(`${item.quantity} x ${item.description}  —  ${quote.currency} ${(item.quantity * item.unitPrice).toFixed(2)}`));
    doc.moveDown().fontSize(13).text(`Total (approval required): ${quote.currency} ${total.toFixed(2)}`);
    if (quote.depositPercent) doc.fontSize(10).text(`Requested deposit: ${quote.depositPercent}% (confirm before use)`);
    doc.moveDown().fillColor("#526071").fontSize(9).text(quote.notes || "Amounts, tax, availability, payment instructions and terms must be approved by the business.");
    doc.end();
  });
}
