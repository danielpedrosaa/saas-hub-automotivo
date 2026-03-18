/**
 * WhatsApp messaging utilities via wa.me deep links.
 * No API required — opens WhatsApp with pre-filled message.
 */

export interface WhatsAppJobData {
  customerName: string;
  customerWhatsapp: string | null;
  vehiclePlate: string;
  vehicleModel: string | null;
  services: { name: string; price: number }[];
  totalPrice: number;
  discount: number;
  shopName: string;
}

export function buildCompletionMessage(data: WhatsAppJobData): string {
  const servicesText = data.services
    .map((s) => `• ${s.name}`)
    .join("\n");

  const finalPrice = Number(data.totalPrice).toFixed(2);

  return [
    `Olá, ${data.customerName}! 👋`,
    ``,
    `Seu veículo *${data.vehiclePlate}*${data.vehicleModel ? ` (${data.vehicleModel})` : ""} foi finalizado com sucesso! ✅`,
    ``,
    `*Serviços realizados:*`,
    servicesText,
    ``,
    ...(data.discount > 0
      ? [`💰 *Desconto:* R$ ${Number(data.discount).toFixed(2)}`, ``]
      : []),
    `💲 *Valor total: R$ ${finalPrice}*`,
    ``,
    `Agradecemos a preferência! 🙏`,
    `*${data.shopName}*`,
  ].join("\n");
}

export function buildReadyMessage(data: WhatsAppJobData): string {
  return [
    `Olá, ${data.customerName}! 👋`,
    ``,
    `Seu veículo *${data.vehiclePlate}* está pronto para retirada! 🚗`,
    ``,
    `💲 *Valor: R$ ${Number(data.totalPrice).toFixed(2)}*`,
    ``,
    `Estamos te aguardando!`,
    `*${data.shopName}*`,
  ].join("\n");
}

/**
 * Formats phone to international format and cleans non-digits.
 * Defaults to Brazil (+55) if no country code detected.
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If already has country code (13+ digits or starts with 55)
  if (digits.length >= 12) return digits;
  // Add Brazil country code
  return `55${digits}`;
}

/**
 * Opens WhatsApp with pre-filled message.
 * Returns false if no WhatsApp number available.
 */
export function sendWhatsApp(phone: string | null, message: string): boolean {
  if (!phone) return false;
  const formatted = formatPhone(phone);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${formatted}?text=${encoded}`, "_blank");
  return true;
}
