import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma!),
  session: {
    strategy: "database",
    maxAge: 3 * 24 * 60 * 60, // 3 days
    updateAge: 60 * 60, // 1 hour
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          hd: "nkust.edu.tw", // 限制只能使用 @nkust.edu.tw 網域的 Google 帳號
        },
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ account, profile }) {
      // 雙重驗證：確保只允許 @nkust.edu.tw 網域
      if (account?.provider === "google") {
        const email = profile?.email;
        if (!email?.toLowerCase().endsWith("@nkust.edu.tw")) {
          return "/auth/error?error=AccessDenied";
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // 正規化 email：將本地部分轉為大寫（保持與舊資料一致）
      if (user.email) {
        const [localPart, domain] = user.email.split("@");
        const normalizedEmail = `${localPart.toUpperCase()}@${domain.toLowerCase()}`;
        if (normalizedEmail !== user.email) {
          await prisma?.user.update({
            where: { id: user.id },
            data: { email: normalizedEmail },
          });
        }
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
