import argon2 from "argon2";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { AdminRole } from "@prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Self-hosted behind a reverse proxy (Caddy terminates TLS, forwards HTTP):
  // trust the proxy's X-Forwarded-Host/Proto so sessions work on the real
  // domain. Without this, Auth.js rejects any non-localhost host and the login
  // loops back. (Can also be set via the AUTH_TRUST_HOST=true env var.)
  trustHost: true,
  session: {
    // The Credentials provider does not support the "database" session
    // strategy, so admin sessions are JWTs. This token is only an
    // optimistic UX signal (used by src/proxy.ts for a fast redirect) —
    // it is NOT the authorization boundary. Next.js/Auth.js both document
    // that proxy/middleware must not be relied on for authorization, and
    // that a page-level check doesn't extend to Server Actions. The real,
    // always-fresh check lives in src/data/auth.ts's getCurrentAdmin(),
    // which re-reads AdminUser.isActive/role from Postgres on every call.
    // Trade-off accepted for this internal tool: a deactivated admin's
    // existing token still passes this optimistic gate for up to maxAge,
    // but every real read/mutation still 401/403s via the DAL regardless.
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const admin = await prisma.adminUser.findUnique({
          where: { email: parsed.data.email },
        });
        if (!admin || !admin.isActive) return null;

        const passwordValid = await argon2.verify(admin.passwordHash, parsed.data.password);
        if (!passwordValid) return null;

        await prisma.adminUser.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date() },
        });

        return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: AdminRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as AdminRole;
      }
      return session;
    },
  },
});
