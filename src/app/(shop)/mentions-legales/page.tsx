import type { Metadata } from "next";
import { mailtoUrl, siteConfig } from "@/config/site";
import { InfoRow, LegalPage } from "@/components/shop/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Mentions légales du site ${siteConfig.name}, édité par ${siteConfig.address.company}.`,
  alternates: { canonical: "/mentions-legales" },
};

const { address, legal } = siteConfig;
const siege = `${address.company}, ${address.line1}, ${address.postalCode} ${address.city}, ${address.country}`;

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updated="16 octobre 2026">
      <p>
        Le site <strong>{siteConfig.name}</strong> est édité par la société <strong>{address.company}</strong>.
        Conformément à la loi n° 53-05 relative à l&apos;échange électronique de données juridiques, les informations
        suivantes sont portées à la connaissance des utilisateurs.
      </p>

      <h2>Éditeur du site</h2>
      <dl className="space-y-2">
        <InfoRow label="Raison sociale" value={address.company} />
        <InfoRow label="Forme juridique" value={legal.form} />
        <InfoRow label="Siège social" value={siege} />
        <InfoRow label="Téléphone" value={siteConfig.phone.display} />
        <InfoRow label="E-mail" value={siteConfig.email} />
      </dl>

      <h2>Hébergement</h2>
      <dl className="space-y-2">
        <InfoRow label="Hébergeur" value={legal.host} />
      </dl>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments du site {siteConfig.name} (textes, visuels, logos, marques, mise en page, structure)
        est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation ou exploitation,
        totale ou partielle, sans autorisation écrite préalable de {address.company}, est interdite. Les marques et
        logos des fabricants cités restent la propriété de leurs titulaires respectifs.
      </p>

      <h2>Responsabilité</h2>
      <p>
        {address.company} s&apos;efforce d&apos;assurer l&apos;exactitude des informations publiées (descriptions, prix,
        disponibilités). Des erreurs ou omissions peuvent toutefois survenir ; les informations ne sont pas
        contractuelles et sont confirmées lors de la validation de la commande par un conseiller. {address.company} ne
        saurait être tenue responsable d&apos;un dommage résultant d&apos;une indisponibilité du site ou de l&apos;usage
        qui en est fait.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Les données collectées (nom, téléphone, e-mail, adresse de livraison) servent uniquement au traitement et au
        suivi des commandes et à la relation client. Conformément à la loi n° 09-08 relative à la protection des
        personnes physiques à l&apos;égard du traitement des données à caractère personnel, vous disposez d&apos;un droit
        d&apos;accès, de rectification et d&apos;opposition. Pour l&apos;exercer, écrivez-nous à{" "}
        <a href={mailtoUrl()}>{siteConfig.email}</a>. Les traitements sont, le cas échéant, déclarés auprès de la CNDP.
      </p>

      <h2>Cookies</h2>
      <p>
        Le site peut déposer des cookies techniques nécessaires à son fonctionnement (par exemple la mémorisation du
        panier). Vous pouvez configurer votre navigateur pour les refuser ; certaines fonctionnalités pourraient alors
        ne plus être disponibles.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question, contactez-nous au <a href={`tel:${siteConfig.phone.e164}`}>{siteConfig.phone.display}</a> ou
        à <a href={mailtoUrl()}>{siteConfig.email}</a>. Voir aussi nos{" "}
        <a href="/cgv">conditions générales de vente</a>.
      </p>
    </LegalPage>
  );
}
