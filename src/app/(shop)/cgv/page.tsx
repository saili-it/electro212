import type { Metadata } from "next";
import { mailtoUrl, siteConfig } from "@/config/site";
import { formatDh } from "@/lib/money";
import { LegalPage } from "@/components/shop/legal";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: `Conditions générales de vente (CGV) de ${siteConfig.name}, édité par ${siteConfig.address.company}.`,
  alternates: { canonical: "/cgv" },
};

const { address } = siteConfig;

export default function CgvPage() {
  return (
    <LegalPage title="Conditions générales de vente" updated="16 octobre 2026">
      <p>
        Les présentes conditions générales de vente (CGV) régissent les ventes conclues sur le site{" "}
        <strong>{siteConfig.name}</strong>, édité par <strong>{address.company}</strong> (ci-après « le Vendeur »).
        Toute commande implique l&apos;acceptation sans réserve des présentes CGV.
      </p>

      <h2>1. Objet</h2>
      <p>
        Les présentes CGV définissent les droits et obligations des parties dans le cadre de la vente de produits
        d&apos;électroménager, de téléviseurs et d&apos;articles associés proposés sur le site, au profit de clients
        particuliers (ci-après « le Client »).
      </p>

      <h2>2. Produits</h2>
      <p>
        Les produits sont présentés avec le plus grand soin. Les photographies et descriptifs sont fournis à titre
        indicatif et n&apos;ont pas de valeur contractuelle. La disponibilité affichée est indicative : elle est
        confirmée par un conseiller lors de la validation de la commande. En cas d&apos;indisponibilité après commande,
        le Client en est informé et peut être remboursé de toute somme déjà versée.
      </p>

      <h2>3. Prix</h2>
      <p>
        Les prix sont indiqués en dirhams marocains (DH), toutes taxes comprises. Les éventuels frais de livraison sont
        indiqués séparément et confirmés par un conseiller avant la validation définitive. Le Vendeur se réserve le droit
        de modifier ses prix à tout moment ; les produits sont facturés sur la base du tarif en vigueur au moment de la
        confirmation de la commande. En cas d&apos;erreur manifeste de prix, le Vendeur se réserve le droit d&apos;annuler
        la commande.
      </p>

      <h2>4. Commande</h2>
      <p>
        Le Client passe commande via le panier du site, ou par WhatsApp / téléphone. La commande n&apos;est définitive
        qu&apos;après confirmation par un conseiller (disponibilité, frais de livraison et modalités de règlement). Le
        Vendeur se réserve le droit de refuser ou d&apos;annuler toute commande en cas de litige antérieur, de commande
        anormale, ou d&apos;indisponibilité du produit.
      </p>

      <h2>5. Paiement</h2>
      <p>Plusieurs modes de règlement sont proposés :</p>
      <ul>
        <li>
          <strong>Paiement à la livraison</strong> : règlement en espèces à la réception de la commande.
        </li>
        <li>
          <strong>Virement bancaire</strong> : les coordonnées bancaires sont communiquées par un conseiller ; la commande
          est préparée après réception du paiement.
        </li>
        <li>
          <strong>Règlement en magasin</strong> : paiement et retrait directement en magasin.
        </li>
      </ul>

      <h2>6. Livraison</h2>
      <p>
        La livraison est assurée au Maroc. Elle est <strong>offerte dès {formatDh(siteConfig.freeDeliveryThresholdMad)}</strong>{" "}
        d&apos;achat ; en deçà, les frais sont confirmés par un conseiller selon la zone de livraison. Les délais sont
        communiqués à titre indicatif lors de la confirmation. Le Client est invité à vérifier l&apos;état du produit et
        la conformité de la commande à la réception et à signaler toute réserve sans délai.
      </p>

      <h2>7. Droit de rétractation et retours</h2>
      <p>
        Conformément à la loi n° 31-08 édictant des mesures de protection du consommateur, le Client dispose d&apos;un
        délai de <strong>sept (7) jours</strong> à compter de la réception pour se rétracter, pour les produits éligibles,
        sans avoir à justifier de motif. Le produit doit être retourné neuf, complet, dans son emballage d&apos;origine et
        non utilisé. Les frais de retour restent à la charge du Client, sauf erreur du Vendeur ou produit défectueux.
        Après vérification, le Vendeur procède à l&apos;échange ou au remboursement.
      </p>

      <h2>8. Garanties</h2>
      <p>
        Les produits bénéficient de la garantie légale contre les vices cachés ainsi que, le cas échéant, de la garantie
        commerciale du fabricant, dans les conditions précisées sur le bon de garantie fourni avec le produit. La
        garantie ne couvre pas les dommages résultant d&apos;un usage non conforme, d&apos;un défaut d&apos;entretien ou
        d&apos;une intervention non autorisée.
      </p>

      <h2>9. Service après-vente</h2>
      <p>
        Pour toute demande de service après-vente, contactez-nous au{" "}
        <a href={`tel:${siteConfig.phone.e164}`}>{siteConfig.phone.display}</a> ou à{" "}
        <a href={mailtoUrl()}>{siteConfig.email}</a>.
      </p>

      <h2>10. Données personnelles</h2>
      <p>
        Les données du Client sont traitées conformément à la loi n° 09-08 et à notre politique décrite dans les{" "}
        <a href="/mentions-legales">mentions légales</a>.
      </p>

      <h2>11. Droit applicable et litiges</h2>
      <p>
        Les présentes CGV sont soumises au droit marocain. En cas de litige, et à défaut de résolution amiable, les
        tribunaux compétents de Casablanca seront saisis.
      </p>
    </LegalPage>
  );
}
