export const WHATSAPP_NUMBER = "254740879234";

export const createWhatsAppLink = (serviceTitle: string) => {
    const message = `Hello NexaSync,

I am interested in your ${serviceTitle} service.

Please send more details.`.trim();

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};
