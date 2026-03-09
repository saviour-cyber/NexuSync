import { createWhatsAppLink } from "@/config/whatsapp";

export const openWhatsApp = (serviceTitle: string) => {
    const url = createWhatsAppLink(serviceTitle);
    window.open(url, "_blank", "noopener,noreferrer");
};
