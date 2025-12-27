import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma!),
  session: {
    strategy: "database",
    maxAge: 3 * 24 * 60 * 60, // 3 days (reduced from 7 for better security)
    updateAge: 60 * 60, // 1 hour
  },
  providers: [
    EmailProvider({
      server: "", // Not used with custom sendVerificationRequest
      from: process.env.EMAIL_FROM!,
      normalizeIdentifier(identifier: string): string {
        // 統一將 email 本地部分轉為大寫
        const [localPart, domain] = identifier.split("@");
        return `${localPart.toUpperCase()}@${domain.toLowerCase()}`;
      },
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const isDev = process.env.NODE_ENV === "development";

        // 統一將 email 本地部分轉為大寫（如 c109193108@nkust.edu.tw -> C109193108@nkust.edu.tw）
        const [localPart, domain] = email.split("@");
        const normalizedEmail = `${localPart.toUpperCase()}@${domain.toLowerCase()}`;

        // 只在開發環境顯示詳細 log
        if (isDev) {
          console.log("=== sendVerificationRequest called ===");
          // 遮罩 email（只顯示部分）
          const maskedEmail = normalizedEmail.replace(/(.{3})(.*)(@.+)/, "$1***$3");
          console.log("Email:", maskedEmail);
          console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✓ Set" : "✗ Not set");
        }

        // 驗證 @nkust.edu.tw
        if (!normalizedEmail.toLowerCase().endsWith("@nkust.edu.tw")) {
          if (isDev) {
            console.error("❌ Email validation failed");
          }
          throw new Error("Only @nkust.edu.tw emails are allowed");
        }

        try {
          const result = await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: normalizedEmail,
            subject: "登入 高科選課雷達",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>登入 高科選課雷達</h2>
                <p>點擊以下連結完成登入：</p>
                <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #0070f3; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  登入
                </a>
                <p style="color: #666; font-size: 14px;">
                  此連結將在 24 小時後過期。<br />
                  如果您沒有請求登入，請忽略此郵件。
                </p>
              </div>
            `,
          });

          if (isDev) {
            console.log("✓ Email sent successfully!");
          }
        } catch (error) {
          console.error("Failed to send verification email");
          if (isDev) {
            console.error("Error details:", error);
          }
          throw new Error("Failed to send verification email");
        }
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
        session.user.role = user.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
