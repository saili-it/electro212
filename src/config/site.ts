// Public business facts shown on the storefront. Values come from the
// existing site (example.jpeg); change them here, not in components.
export const siteConfig = {
  name: "Electro212",
  tagline: "Électroménager, TV et meubles TV au Maroc",
  description:
    "Electro212 : gros et petit électroménager, téléviseurs, climatiseurs, encastrable et meubles TV des grandes marques.",
  url: process.env.SITE_URL ?? "http://localhost:3000",
  email: "online@easydis.co.ma",
  phone: {
    display: "(212) 667333472",
    e164: "+212667333472",
    label: "Téléphone 24/7",
  },
  // Same line as the phone, used for both calls and WhatsApp.
  whatsapp: {
    number: "212667333472",
    message: "Bonjour Electro212, j'ai une question.",
  },
  // Siège social (localisé via le repère Google Maps fourni par le client).
  address: {
    company: "EASYDIS SARL",
    line1: "Douar Oulad Ahmed, Lahfafra",
    city: "Nouaceur",
    postalCode: "27000",
    country: "Maroc",
    lat: 33.5037317,
    lng: -7.7036935,
    mapsUrl:
      "https://www.google.com/maps/place/EASYDIS+SARL/@33.5037361,-7.7062684,731m/data=!3m2!1e3!4b1!4m6!3m5!1s0xda62bf72d61c787:0x897dd669dc98e27a!8m2!3d33.5037317!4d-7.7036935",
  },
  // Mentions légales — champs non sensibles uniquement. Les identifiants
  // fiscaux/commerciaux (capital, RC, ICE, IF, patente) ont été retirés à la
  // demande du client. Laissez "" pour masquer une ligne.
  legal: {
    form: "SARL",
    host: "Hostinger", // Hébergeur du site — à compléter
  },
  freeDeliveryThresholdMad: 6000,
  // Meta (Facebook) Pixel ID — a public identifier, loaded on the storefront only.
  // Set to "" to disable tracking.
  metaPixelId: "4870708023215633",
} as const;

export function whatsappUrl(message: string = siteConfig.whatsapp.message) {
  return `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

export function mailtoUrl(subject?: string, body?: string) {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${siteConfig.email}${query ? `?${query}` : ""}`;
}

/** Keyless Google Maps embed centred on the shop, for an <iframe>. */
export function mapsEmbedUrl() {
  const { lat, lng } = siteConfig.address;
  return `https://www.google.com/maps?q=${lat},${lng}&z=15&hl=fr&output=embed`;
}
