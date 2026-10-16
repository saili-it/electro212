import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma";

/*
 * Creates (or resets) a SUPER_ADMIN account so you can log in at /admin/login.
 * The catalogue seed does not create any admin on purpose.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' npm run db:create-admin
 *
 * Re-running with the same e-mail updates the password and re-activates the account.
 */
async function main() {
  const email = (process.env.ADMIN_EMAIL || process.argv[2] || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.argv[3] || "";
  const name = process.env.ADMIN_NAME || process.argv[4] || "Administrateur";

  if (!email || !password) {
    console.error("Usage : ADMIN_EMAIL=... ADMIN_PASSWORD=... [ADMIN_NAME=...] npm run db:create-admin");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Le mot de passe doit comporter au moins 8 caractères.");
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, isActive: true, role: "SUPER_ADMIN" },
    create: { email, passwordHash, name, role: "SUPER_ADMIN", isActive: true },
  });

  console.log(`Admin prêt : ${admin.email} (${admin.role}). Connexion : /admin/login`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
