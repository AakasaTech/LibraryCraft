import "server-only";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";

const providers: Provider[] = [
  Resend({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    // Local dev without a Resend key: print the magic link instead of emailing it.
    ...(!env.RESEND_API_KEY && env.NODE_ENV !== "production"
      ? { sendVerificationRequest: async ({ url }: { url: string }) => console.info(`[auth] magic link: ${url}`) }
      : {}),
  }),
];
if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) providers.unshift(Google);

export const googleEnabled = providers.length > 1;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  providers,
  pages: { signIn: "/sign-in", verifyRequest: "/verify" },
});
