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

        // 只在開發環境顯示詳細 log（使用 warn 以符合 ESLint 規則）
        if (isDev) {
          console.warn("=== sendVerificationRequest called ===");
          // 遮罩 email（只顯示部分）
          const maskedEmail = normalizedEmail.replace(/(.{3})(.*)(@.+)/, "$1***$3");
          console.warn("Email:", maskedEmail);
          console.warn("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✓ Set" : "✗ Not set");
        }

        // 驗證 @nkust.edu.tw
        if (!normalizedEmail.toLowerCase().endsWith("@nkust.edu.tw")) {
          if (isDev) {
            console.error("❌ Email validation failed");
          }
          throw new Error("Only @nkust.edu.tw emails are allowed");
        }

        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: normalizedEmail,
            subject: "登入高科選課雷達 - 驗證您的身份",
            html: `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans TC', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <img src="https://nkust.zeabur.app/icon-email.png" alt="Logo" width="48" height="48" style="margin-bottom: 12px; border-radius: 10px;" />
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #18181b;">高科選課雷達</h1>
              <p style="margin: 4px 0 0; font-size: 14px; color: #71717a;">選課，不只是憑感覺</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #18181b;">驗證您的登入請求</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                您正在嘗試登入高科選課雷達。點擊下方按鈕完成驗證：
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      確認登入
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="padding: 16px; background-color: #fafafa; border-radius: 10px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-size: 13px; color: #52525b; line-height: 1.5;">
                  <strong style="color: #18181b;">安全提醒</strong><br>
                  此連結將在 24 小時後失效，且只能使用一次。<br>
                  如果這不是您本人的操作，請忽略此郵件。
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 16px 16px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #71717a; text-align: center;">
                此郵件由系統自動發送，請勿直接回覆。
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} 高科選課雷達 ·
                <a href="https://nkust.zeabur.app" style="color: #3b82f6; text-decoration: none;">nkust.zeabur.app</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Sub-footer -->
        <p style="margin: 24px 0 0; font-size: 11px; color: #a1a1aa; text-align: center;">
          如果按鈕無法點擊，請複製以下連結到瀏覽器：<br>
          <a href="${url}" style="color: #71717a; word-break: break-all;">${url}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
            `,
          });

          if (isDev) {
            console.warn("✓ Email sent successfully!");
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
