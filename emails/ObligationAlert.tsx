import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";
import { formatDate, formatCurrency } from "@/lib/utils";

interface ObligationAlertProps {
  clientName: string;
  offshoreName: string;
  nature: string;
  effectiveDue: Date;
  invoiceValue: number | null;
  invoiceCurrency: string;
  daysBefore: 0 | 2 | 5 | 30;
}

export function ObligationAlert({
  clientName,
  offshoreName,
  nature,
  effectiveDue,
  invoiceValue,
  invoiceCurrency,
  daysBefore,
}: ObligationAlertProps) {
  const urgencyLabel =
    daysBefore === 0
      ? "vence HOJE"
      : `vence em ${daysBefore} dia${"s"}`;

  const preview = `Obrigação ${urgencyLabel} — ${offshoreName} (${clientName})`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Vision Offshore</Heading>
          <Text style={styles.subheading}>Alerta de Vencimento</Text>
          <Hr style={styles.hr} />

          <Section>
            <Row>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{clientName}</Text>
            </Row>
            <Row>
              <Text style={styles.label}>Offshore</Text>
              <Text style={styles.value}>{offshoreName}</Text>
            </Row>
            <Row>
              <Text style={styles.label}>Obrigação</Text>
              <Text style={styles.value}>{nature}</Text>
            </Row>
            <Row>
              <Text style={styles.label}>Vencimento</Text>
              <Text style={{ ...styles.value, fontWeight: daysBefore <= 2 ? "bold" : "normal" }}>
                {formatDate(effectiveDue)} ({urgencyLabel})
              </Text>
            </Row>
            {invoiceValue !== null && (
              <Row>
                <Text style={styles.label}>Valor</Text>
                <Text style={styles.value}>{formatCurrency(invoiceValue, invoiceCurrency)}</Text>
              </Row>
            )}
          </Section>

          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Vision Offshore — Gennesys. Acesse a plataforma para registrar o pagamento.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: "#f9fafb", fontFamily: "Inter, sans-serif" },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "32px",
    maxWidth: "560px",
    margin: "24px auto",
  },
  heading: { fontSize: "20px", fontWeight: "600", color: "#111827", margin: "0 0 4px" },
  subheading: { fontSize: "14px", color: "#6b7280", margin: "0 0 20px" },
  hr: { borderColor: "#e5e7eb", margin: "20px 0" },
  label: { fontSize: "12px", color: "#6b7280", margin: "0", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  value: { fontSize: "15px", color: "#111827", margin: "2px 0 12px" },
  footer: { fontSize: "12px", color: "#9ca3af", textAlign: "center" as const },
};
