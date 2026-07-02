import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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

// Email + password credentials — always available
providers.push(
  Credentials({
    id: "credentials",
    name: "Email & Password",
    credentials: {
      email:    { label: "Email",    type: "email"    },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const user = await db.user.findUnique({
        where: { email: credentials.email as string },
      });
      if (!user?.password) return null;
      const valid = await bcrypt.compare(
        credentials.password as string,
        user.password
      );
      return valid ? user : null;
    },
  })
);

// Dev-only: email lookup with no password — never in production
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
        return db.user.findUnique({
          where: { email: credentials.email as string },
        });
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  trustHost: true,
  session: {
    // Credentials providers require JWT — database sessions only work with OAuth
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
