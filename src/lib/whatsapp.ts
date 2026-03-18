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

export function parseTemplate(templateText: string, data: WhatsAppJobData): string {
  const servicesText = data.services.map(s => s.name).join(", ") || "Nenhum";
  const valorFormatado = `R$ ${Number(data.totalPrice).toFixed(2)}`;

  return templateText
    .replace(/\{nome_cliente\}/g, data.customerName || "Cliente")
    .replace(/\{placa\}/g, data.vehiclePlate || "N/A")
    .replace(/\{servicos\}/g, servicesText)
    .replace(/\{valor\}/g, valorFormatado)
    .replace(/\{nome_loja\}/g, data.shopName || "Nossa Loja");
}

const DEFAULT_DONE_TEXT = "Olá, {nome_cliente}! Os serviços ({servicos}) no veículo {placa} foram concluídos com sucesso. O valor final ficou em {valor}. Agradecemos a preferência! - {nome_loja}";
const DEFAULT_READY_TEXT = "Olá, {nome_cliente}! Seu veículo {placa} está pronto para retirada em {nome_loja}. O valor total foi de {valor}. Estamos te aguardando!";

export function buildCompletionMessage(data: WhatsAppJobData, templates?: any[]): string {
  if (Array.isArray(templates)) {
     const custom = templates.find(t => t.trigger_type === 'job_done' && t.active);
     if (custom && custom.message_template) {
         return parseTemplate(custom.message_template, data);
     }
  }
  return parseTemplate(DEFAULT_DONE_TEXT, data);
}

export function buildReadyMessage(data: WhatsAppJobData, templates?: any[]): string {
  // Para fins nativos, deixaremos a de retirada usando um fallback simples
  // pois a customização exigida pela issue focava no job_done base.
  return parseTemplate(DEFAULT_READY_TEXT, data);
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 12) return digits;
  return `55${digits}`;
}

export function sendWhatsApp(phone: string | null, message: string): boolean {
  if (!phone) return false;
  const formatted = formatPhone(phone);
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${formatted}?text=${encoded}`, "_blank");
  return true;
}
