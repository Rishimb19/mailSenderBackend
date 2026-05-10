// src/controllers/sendEmailController.js
const { google } = require("googleapis");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const sendEmails = async (req, res) => {
  try {
    const { recipients, subject, body, fromName } = req.body;
    const userId = req.user.id;

    console.log("Send email request:", {
      userId,
      recipientsCount: recipients?.length,
      subject,
    });

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "No recipients provided" },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        error: { message: "Please connect your Gmail account first" },
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const fromEmail = user.email;

    const results = [];
    const MAX_EMAILS = 5;
    const emailsToSend = recipients.slice(0, MAX_EMAILS);

    for (const recipient of emailsToSend) {
      try {
        let personalizedBody = body;

        if (recipient.toName) {
          personalizedBody = personalizedBody.replace(
            /\[toName\]/g,
            recipient.toName,
          );
          personalizedBody = personalizedBody.replace(
            /\{\{toName\}\}/g,
            recipient.toName,
          );
        }
        if (recipient.companyName) {
          personalizedBody = personalizedBody.replace(
            /\[companyName\]/g,
            recipient.companyName,
          );
          personalizedBody = personalizedBody.replace(
            /\{\{companyName\}\}/g,
            recipient.companyName,
          );
        }

        const emailContent = [
          `From: ${fromName || user.name || "Team"} <${fromEmail}>`,
          `To: ${recipient.email}`,
          `Subject: ${subject}`,
          "MIME-Version: 1.0",
          "Content-Type: text/html; charset=utf-8",
          "",
          personalizedBody,
        ].join("\n");

        const encodedEmail = Buffer.from(emailContent)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw: encodedEmail },
        });

        results.push({ email: recipient.email, status: "sent", error: null });
      } catch (err) {
        console.error(`Failed to send to ${recipient.email}:`, err.message);
        results.push({
          email: recipient.email,
          status: "failed",
          error: err.message,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (recipients.length > MAX_EMAILS) {
      for (let i = MAX_EMAILS; i < recipients.length; i++) {
        results.push({
          email: recipients[i].email,
          status: "skipped",
          error: "Rate limit: Max 5 emails per batch",
        });
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          total: recipients.length,
          sent: results.filter((r) => r.status === "sent").length,
          failed: results.filter((r) => r.status === "failed").length,
          skipped: results.filter((r) => r.status === "skipped").length,
        },
        details: results,
      },
    });
  } catch (error) {
    console.error("Send emails error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to send emails" },
    });
  }
};

module.exports = { sendEmails };
