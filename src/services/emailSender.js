// src/services/emailSender.js
const { google } = require("googleapis");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get Gmail client for user
const getGmailClient = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.gmailAccessToken) {
    throw new Error(
      "Gmail not connected. Please connect your Gmail account first.",
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken,
    expiry_date: user.gmailTokenExpiry?.getTime(),
  });

  // Refresh token if expired
  if (user.gmailTokenExpiry && new Date() > user.gmailTokenExpiry) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: credentials.access_token,
        gmailTokenExpiry: new Date(Date.now() + (credentials.expiry_date || 0)),
      },
    });
    oauth2Client.setCredentials(credentials);
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
};

// Send single email
const sendEmail = async (gmail, to, subject, body, fromEmail, fromName) => {
  try {
    const emailContent = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      body,
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

    return { success: true, error: null };
  } catch (error) {
    console.error("Send email error:", error);
    return { success: false, error: error.message };
  }
};

// Send bulk emails (max 5 at a time)
const sendBulkEmails = async (
  userId,
  campaignId,
  subject,
  bodyHtml,
  recipients,
  fromName,
) => {
  const results = [];
  const MAX_PER_BATCH = 5;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.gmailAccessToken) {
      throw new Error("Please connect your Gmail account first");
    }

    const gmail = await getGmailClient(userId);
    const fromEmail = user.email;

    // Validate all emails
    const validatedRecipients = recipients.map((r) => ({
      ...r,
      isValid: validateEmail(r.email),
    }));

    const validEmails = validatedRecipients.filter((r) => r.isValid);
    const invalidCount = validatedRecipients.length - validEmails.length;

    // Send to valid emails (max 5)
    const toSend = validEmails.slice(0, MAX_PER_BATCH);
    const skippedCount =
      validEmails.length > MAX_PER_BATCH
        ? validEmails.length - MAX_PER_BATCH
        : 0;

    for (const recipient of toSend) {
      let personalizedBody = bodyHtml;

      // Replace personalization fields
      Object.keys(recipient).forEach((key) => {
        if (key !== "email" && recipient[key]) {
          const regex = new RegExp(`{{${key}}}`, "gi");
          personalizedBody = personalizedBody.replace(regex, recipient[key]);
          personalizedBody = personalizedBody.replace(
            `[${key}]`,
            recipient[key],
          );
        }
      });

      const result = await sendEmail(
        gmail,
        recipient.email,
        subject,
        personalizedBody,
        fromEmail,
        fromName,
      );

      results.push({
        email: recipient.email,
        status: result.success ? "sent" : "failed",
        error: result.error,
      });

      // Delay between emails
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Add skipped results
    validEmails.slice(MAX_PER_BATCH).forEach((recipient) => {
      results.push({
        email: recipient.email,
        status: "skipped",
        error: "Rate limit: Max 5 emails per batch",
      });
    });

    // Add invalid results
    validatedRecipients
      .filter((r) => !r.isValid)
      .forEach((recipient) => {
        results.push({
          email: recipient.email,
          status: "invalid",
          error: "Invalid email format",
        });
      });

    // Update campaign
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "sent",
        sentCount: results.filter((r) => r.status === "sent").length,
        failedCount: results.filter((r) => r.status === "failed").length,
        invalidCount:
          invalidCount + results.filter((r) => r.status === "invalid").length,
        totalRecipients: recipients.length,
        completedAt: new Date(),
      },
    });

    return {
      summary: {
        total: recipients.length,
        sent: results.filter((r) => r.status === "sent").length,
        failed: results.filter((r) => r.status === "failed").length,
        invalid: results.filter((r) => r.status === "invalid").length,
        skipped: results.filter((r) => r.status === "skipped").length,
      },
      details: results,
    };
  } catch (error) {
    console.error("Bulk send error:", error);
    throw error;
  }
};

module.exports = { sendBulkEmails, validateEmail, getGmailClient };
