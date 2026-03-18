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

export interface MessageTemplate {
  greeting: string;
  main_text: string;
  thanks_message: string;
  signature: string;
}

const DEFAULT_TEMPLATE: MessageTemplate = {
  greeting: "Olá, {{nome_cliente}}! 👋",
  main_text: "Seu veículo *{{placa}}* foi finalizado com sucesso! ✅",
  thanks_message: "Agradecemos a preferência! 🙏",
  signature: "",
};

function applyVariables(text: string, data: WhatsAppJobData): string {
  return text
    .replace(/\{\{nome_cliente\}\}/g, data.customerName)
    .replace(/\{\{placa\}\}/g, data.vehiclePlate)
    .replace(/\{\{modelo\}\}/g, data.vehicleModel || "")
    .replace(/\{\{valor\}\}/g, `R$ ${Number(data.totalPrice).toFixed(2)}`)
    .replace(/\{\{loja\}\}/g, data.shopName);
}

export function buildCompletionMessage(data: WhatsAppJobData, template?: MessageTemplate | null): string {
  const t = template || DEFAULT_TEMPLATE;

  const servicesText = data.services
    .map((s) => `• ${s.name}`)
    .join("\n");

  const finalPrice = Number(data.totalPrice).toFixed(2);

  return [
    applyVariables(t.greeting, data),
    ``,
    applyVariables(t.main_text, data),
    ``,
    `*Serviços realizados:*`,
    servicesText,
    ``,
    ...(data.discount > 0
      ? [`💰 *Desconto:* R$ ${Number(data.discount).toFixed(2)}`, ``]
      : []),
    `💲 *Valor total: R$ ${finalPrice}*`,
    ``,
    applyVariables(t.thanks_message, data),
    ...(t.signature ? [`*${applyVariables(t.signature, data)}*`] : [`*${data.shopName}*`]),
  ].join("\n");
}

export function buildReadyMessage(data: WhatsAppJobData, template?: MessageTemplate | null): string {
  const t = template || DEFAULT_TEMPLATE;

  return [
    applyVariables(t.greeting, data),
    ``,
    `Seu veículo *${data.vehiclePlate}* está pronto para retirada! 🚗`,
    ``,
    `💲 *Valor: R$ ${Number(data.totalPrice).toFixed(2)}*`,
    ``,
    `Estamos te aguardando!`,
    ...(t.signature ? [`*${applyVariables(t.signature, data)}*`] : [`*${data.shopName}*`]),
  ].join("\n");
}

/**
 * Formats phone to international format and cleans non-digits.
 * Defaults to Brazil (+55) if no country code detected.
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 12) return digits;
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
