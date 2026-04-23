// Format: {4 consonants of recipient}{total integer}USD{MMDDYYYY}
export function buildInvoiceNumber(
  recipientName: string,
  total: number,
  issueDate: Date,
): string {
  const consonants = recipientName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .replace(/[AEIOU]/g, "")
    .slice(0, 4);

  const totalInt = Math.round(total);
  const mm = String(issueDate.getMonth() + 1).padStart(2, "0");
  const dd = String(issueDate.getDate()).padStart(2, "0");
  const yyyy = issueDate.getFullYear();

  return `${consonants}${totalInt}USD${mm}${dd}${yyyy}`;
}
