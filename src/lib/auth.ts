import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";

const providers: Provider[] = [];

// Google OAuth — only if configured
if (process.env.GOOGLE_CLIENT_ID) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

// Dev-only credentials provider — email lookup, no password
// NEVER enable in production
if (process.env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        return user;
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: {
    // Credentials provider requires JWT (database sessions don't work with it)
    strategy: process.env.NODE_ENV !== "production" ? "jwt" : "database",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        // JWT mode uses token.id, database mode uses user.id
        session.user.id = (token?.id as string) ?? user?.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
