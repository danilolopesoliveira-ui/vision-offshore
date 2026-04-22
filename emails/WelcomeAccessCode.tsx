import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "react-email";

interface WelcomeAccessCodeProps {
  recipientName: string;
  accessCode: string;
  intendedRole: string;
  expiresAt: Date;
  appUrl: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  SUPER_ADMIN: "Super Administrador",
};

export function WelcomeAccessCode({
  recipientName,
  accessCode,
  intendedRole,
  expiresAt,
  appUrl,
}: WelcomeAccessCodeProps) {
  const roleLabel = ROLE_LABELS[intendedRole] ?? intendedRole;
  const expiresFormatted = expiresAt.toLocaleDateString("pt-BR");

  return (
    <Html>
      <Head />
      <Preview>Seu código de acesso ao Vision Offshore — {accessCode}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Vision Offshore</Heading>
          <Text style={styles.subheading}>Bem-vindo à plataforma Gennesys</Text>
          <Hr style={styles.hr} />

          <Text style={styles.text}>Olá{recipientName ? `, ${recipientName}` : ""},</Text>
          <Text style={styles.text}>
            Você recebeu acesso ao Vision Offshore como <strong>{roleLabel}</strong>. Use o código
            abaixo para criar sua conta:
          </Text>

          <Text style={styles.code}>{accessCode}</Text>

          <Text style={styles.instruction}>
            Acesse <strong>{appUrl}/login</strong>, clique em &quot;Não tem conta? Use seu código de
            acesso&quot; e insira o código acima.
          </Text>

          <Hr style={styles.hr} />
          <Text style={styles.warning}>
            Este código expira em <strong>{expiresFormatted}</strong> e só pode ser usado uma vez.
            Não compartilhe.
          </Text>

          <Text style={styles.footer}>Vision Offshore — Gennesys</Text>
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
    maxWidth: "520px",
    margin: "24px auto",
  },
  heading: { fontSize: "20px", fontWeight: "600", color: "#111827", margin: "0 0 4px" },
  subheading: { fontSize: "14px", color: "#6b7280", margin: "0 0 20px" },
  hr: { borderColor: "#e5e7eb", margin: "20px 0" },
  text: { fontSize: "15px", color: "#374151", lineHeight: "1.6" },
  code: {
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "0.15em",
    color: "#059669",
    textAlign: "center" as const,
    padding: "20px",
    backgroundColor: "#f0fdf4",
    borderRadius: "8px",
    margin: "20px 0",
  },
  instruction: { fontSize: "14px", color: "#6b7280" },
  warning: { fontSize: "13px", color: "#ef4444" },
  footer: { fontSize: "12px", color: "#9ca3af", textAlign: "center" as const, marginTop: "24px" },
};
