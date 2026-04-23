import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import type { InvoiceItem } from "@/lib/pdf/invoice-pdf";
import path from "path";
import fs from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice não encontrada" }, { status: 404 });
  }

  const logoPath = path.join(process.cwd(), "public", "zahav-logo.png");
  const logoExists = fs.existsSync(logoPath);

  const element = React.createElement(InvoicePDF, {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    recipient: {
      name: invoice.recipientName,
      address: invoice.recipientAddress,
    },
    items: invoice.items as unknown as InvoiceItem[],
    total: Number(invoice.total),
    currency: invoice.currency,
    logoPath: logoExists ? logoPath : null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const arrayBuffer = await renderToBuffer(element);
  const buffer = Buffer.from(arrayBuffer);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
}
