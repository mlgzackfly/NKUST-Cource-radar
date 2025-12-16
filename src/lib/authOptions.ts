import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma!),
  providers: [
    EmailProvider({
      server: "", // Not used with custom sendVerificationRequest
      from: process.env.EMAIL_FROM!,
      async sendVerificationRequest({ identifier: email, url }) {
        // 驗證 @nkust.edu.tw
        if (!email.toLowerCase().endsWith("@nkust.edu.tw")) {
          throw new Error("Only @nkust.edu.tw emails are allowed");
        }

        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: "登入 高科選課雷達",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>登入 高科選課雷達</h2>
              <p>點擊以下連結完成登入：</p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #0070f3; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                登入
              </a>
              <p style="color: #666; font-size: 14px;">
                此連結將在 10 分鐘後過期。<br />
                如果您沒有請求登入，請忽略此郵件。
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
