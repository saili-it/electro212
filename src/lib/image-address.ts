import { z } from "zod";

/**
 * Address of an image typed into an admin form (category image, brand logo):
 * either a full web link, or the path of a file shipped with the site, such as
 * "/brands/lg.png" or "/categories/encastrable.webp".
 */
export const imageAddressSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => /^https?:\/\/\S+$/i.test(value) || /^\/(?!\/)\S*$/.test(value), {
    message: "Adresse invalide : indiquez un lien https://… ou un fichier du site commençant par « / ».",
  });
