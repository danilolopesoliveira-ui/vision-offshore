import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";

const ZAHAV = {
  name: "ZAHAV INVESTMENTS LIMITED",
  line1: "Trident Chambers, P.O. Box 146",
  line2: "Road Town, Tortola",
  line3: "British Virgin Islands",
};

const BANK = {
  name: "Citibank N.A",
  address: "111 Wall Street New York, NY 10005",
  aba: "021 000 089",
  swift: "CITIUS33",
  accountName: "Morgan Stanley Smith Barney LLC",
  accountNumber: "40611172",
  beneficiaryName: "ZAHAV INVESTMENTS LIMITED",
  beneficiaryAccount: "093-057990-007",
};

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface InvoicePDFProps {
  invoiceNumber: string;
  issueDate: Date | string;
  recipient: {
    name: string;
    address: string;
  };
  items: InvoiceItem[];
  total: number;
  currency: string;
  logoPath?: string | null;
}

const navy = "#1a3a6b";
const gray = "#555555";
const lightGray = "#e5e7eb";
const veryLightGray = "#f3f4f6";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#222222",
    paddingTop: 36,
    paddingBottom: 50,
    paddingLeft: 50,
    paddingRight: 50,
  },

  // ── Header ──────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  logo: {
    width: 130,
    height: 44,
  },
  logoFallback: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: navy,
    letterSpacing: 1,
  },
  invoiceTitleBlock: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: navy,
    letterSpacing: 1,
    marginBottom: 3,
  },
  invoiceRef: {
    fontSize: 9,
    color: gray,
    marginBottom: 2,
  },
  invoiceDateText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#222222",
  },

  // ── Address row ─────────────────────────────────────────
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  addressBlock: {
    width: "47%",
  },
  addressIntro: {
    fontSize: 8.5,
    color: gray,
    marginBottom: 3,
  },
  addressName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 9.5,
    color: "#444444",
    lineHeight: 1.45,
  },

  // ── Section label ────────────────────────────────────────
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: lightGray,
    borderBottomStyle: "solid",
  },

  // ── Line items ───────────────────────────────────────────
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 5,
    paddingBottom: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: veryLightGray,
    borderBottomStyle: "solid",
  },
  itemDesc: {
    flex: 1,
    fontSize: 9.5,
    color: "#444444",
    paddingRight: 16,
    lineHeight: 1.4,
  },
  itemAmount: {
    fontSize: 9.5,
    width: 80,
    textAlign: "right",
  },

  // ── Total ────────────────────────────────────────────────
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: "#333333",
    borderTopStyle: "solid",
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  totalRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalCurrencyLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginRight: 6,
    color: gray,
  },
  totalAmountValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    minWidth: 80,
  },

  // ── Separator ────────────────────────────────────────────
  separator: {
    marginTop: 20,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#aaaaaa",
    borderTopStyle: "dashed",
  },

  // ── Detach coupon ────────────────────────────────────────
  detachTitle: {
    fontSize: 8,
    color: gray,
    marginBottom: 6,
  },
  detachTable: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#333333",
    borderTopStyle: "solid",
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
    borderBottomStyle: "solid",
  },
  detachCell: {
    flex: 1,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    paddingRight: 5,
    borderRightWidth: 0.5,
    borderRightColor: "#cccccc",
    borderRightStyle: "solid",
  },
  detachCellLast: {
    flex: 1,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    paddingRight: 5,
  },
  detachCellLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: gray,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  detachCellValue: {
    fontSize: 8,
    color: "#222222",
  },

  // ── Bank details ─────────────────────────────────────────
  bankSection: {
    flexDirection: "row",
    marginTop: 18,
  },
  bankLeft: {
    flex: 1,
    paddingRight: 16,
  },
  bankRight: {
    flex: 1,
  },
  bankIntroText: {
    fontSize: 9,
    color: gray,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  bankAddressName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1,
  },
  bankAddressLine: {
    fontSize: 8.5,
    color: gray,
    lineHeight: 1.4,
  },
  bankRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bankRowLabel: {
    fontSize: 8.5,
    color: gray,
    width: 105,
  },
  bankRowValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },
});

function fmtAmount(amount: number): string {
  const abs = Math.abs(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const [int, dec] = abs.split(".");
  const formatted = `${int},${dec ?? "00"}`;
  return amount < 0 ? `$ -${formatted}` : `$ ${formatted}`;
}

function fmtTotal(total: number): string {
  const fixed = total
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const [int, dec] = fixed.split(".");
  return `${int},${dec ?? "00"}`;
}

export function InvoicePDF({
  invoiceNumber,
  issueDate,
  recipient,
  items,
  total,
  currency,
  logoPath,
}: InvoicePDFProps) {
  const date = new Date(issueDate);
  const formattedDate = format(date, "MMMM d, yyyy");
  const shortDate = format(date, "MM/dd/yy");
  const totalStr = `US$ ${fmtTotal(total)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            {logoPath ? (
              <Image src={logoPath} style={styles.logo} />
            ) : (
              <Text style={styles.logoFallback}>ZAHAV</Text>
            )}
          </View>
          <View style={styles.invoiceTitleBlock}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceRef}>{invoiceNumber}</Text>
            <Text style={styles.invoiceDateText}>{formattedDate}</Text>
          </View>
        </View>

        {/* ── Addresses ── */}
        <View style={styles.addressRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressName}>{ZAHAV.name}</Text>
            <Text style={styles.addressLine}>{ZAHAV.line1}</Text>
            <Text style={styles.addressLine}>{ZAHAV.line2}</Text>
            <Text style={styles.addressLine}>{ZAHAV.line3}</Text>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressIntro}>This invoice is in reference to:</Text>
            <Text style={styles.addressName}>{recipient.name}</Text>
            {recipient.address.split("\n").map((line, i) => (
              <Text key={i} style={styles.addressLine}>{line}</Text>
            ))}
          </View>
        </View>

        {/* ── Line items ── */}
        <Text style={styles.sectionLabel}>Reimbursement</Text>
        {items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemDesc}>{item.description}</Text>
            <Text style={styles.itemAmount}>{fmtAmount(item.amount)}</Text>
          </View>
        ))}

        {/* ── Total ── */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
          <View style={styles.totalRight}>
            <Text style={styles.totalCurrencyLabel}>US$</Text>
            <Text style={styles.totalAmountValue}>{fmtTotal(total)}</Text>
          </View>
        </View>

        {/* ── Separator ── */}
        <View style={styles.separator} />

        {/* ── Detach coupon ── */}
        <Text style={styles.detachTitle}>
          PLEASE DETACH AND RETURN THIS PORTION WITH YOUR PAYMENT
        </Text>
        <View style={styles.detachTable}>
          <View style={styles.detachCell}>
            <Text style={styles.detachCellLabel}>Company Name</Text>
            <Text style={styles.detachCellValue}>{recipient.name}</Text>
          </View>
          <View style={styles.detachCell}>
            <Text style={styles.detachCellLabel}>Reference</Text>
            <Text style={styles.detachCellValue}>{invoiceNumber}</Text>
          </View>
          <View style={styles.detachCell}>
            <Text style={styles.detachCellLabel}>Invoice Date</Text>
            <Text style={styles.detachCellValue}>{shortDate}</Text>
          </View>
          <View style={styles.detachCellLast}>
            <Text style={styles.detachCellLabel}>Amount Due</Text>
            <Text style={styles.detachCellValue}>{totalStr}</Text>
          </View>
        </View>

        {/* ── Bank details ── */}
        <View style={styles.bankSection}>
          <View style={styles.bankLeft}>
            <Text style={styles.bankIntroText}>
              Please send your remittance by way of a check or banker&apos;s draft
              {"\n"}drawn on a U.S. bank in favor of ZAHAV INVESTMENTS, LLC to
              {"\n"}the following address:
            </Text>
            <Text style={styles.bankAddressName}>{ZAHAV.name}</Text>
            <Text style={styles.bankAddressLine}>{ZAHAV.line1}</Text>
            <Text style={styles.bankAddressLine}>{ZAHAV.line2}</Text>
            <Text style={styles.bankAddressLine}>{ZAHAV.line3}</Text>
          </View>

          <View style={styles.bankRight}>
            <Text style={styles.bankIntroText}>
              If making payment by wire transfer, please quote our invoice number,
              {"\n"}and wire to:
            </Text>
            <View style={styles.bankRow}>
              <Text style={styles.bankRowLabel}>Bank Name:</Text>
              <Text style={styles.bankRowValue}>{BANK.name}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankRowLabel}>Bank Address:</Text>
              <Text style={styles.bankRowValue}>{BANK.address}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankRowLabel}>ABA Number:</Text>
              <Text style={styles.bankRowValue}>{BANK.aba}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankRowLabel}>SWIFT Address:</Text>
              <Text style={styles.bankRowValue}>{BANK.swift}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankRowLabel}>Account Name:</Text>
              <Text style={styles.bankRowValue}>{BANK.accountName}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankRowLabel}>Account Number:</Text>
              <Text style={styles.bankRowValue}>{BANK.accountNumber}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankRowLabel}>Beneficiary Account Name:</Text>
              <Text style={styles.bankRowValue}>{BANK.beneficiaryName}</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankRowLabel}>Beneficiary Account Number:</Text>
              <Text style={styles.bankRowValue}>{BANK.beneficiaryAccount}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
