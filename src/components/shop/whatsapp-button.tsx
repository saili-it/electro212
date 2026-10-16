import { whatsappUrl } from "@/config/site";
import { WhatsAppIcon } from "./icons";

export function WhatsAppButton() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25d366] py-3 pl-4 pr-5 text-sm font-semibold text-brand-navy shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <WhatsAppIcon className="h-5 w-5" />
      Besoin d&apos;aide ?
    </a>
  );
}
