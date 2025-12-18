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
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    EmailProvider({
      server: "", // Not used with custom sendVerificationRequest
      from: process.env.EMAIL_FROM!,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        console.log("=== sendVerificationRequest called ===");
        console.log("Email:", email);
        console.log("URL:", url);
        console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✓ Set" : "✗ Not set");
        console.log("EMAIL_FROM:", process.env.EMAIL_FROM);

        // 驗證 @nkust.edu.tw
        if (!email.toLowerCase().endsWith("@nkust.edu.tw")) {
          console.error("❌ Email validation failed:", email);
          throw new Error("Only @nkust.edu.tw emails are allowed");
        }

        console.log("✓ Email validation passed");

        try {
          console.log("Sending email via Resend...");
          const result = await resend.emails.send({
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
                  此連結將在 24 小時後過期。<br />
                  如果您沒有請求登入，請忽略此郵件。
                </p>
              </div>
            `,
          });
          console.log("✓ Email sent successfully!", result);
        } catch (error) {
          console.error("❌ Failed to send email:", error);
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
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
