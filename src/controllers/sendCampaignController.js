// src/controllers/sendCampaignController.js
const { google } = require("googleapis");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const sendCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;

    console.log("📧 Send campaign request:", { campaignId, userId });

    // Get campaign
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, error: { message: "Campaign not found" } });
    }

    // Parse recipients
    let recipients = [];
    if (campaign.recipients) {
      try {
        recipients =
          typeof campaign.recipients === "string"
            ? JSON.parse(campaign.recipients)
            : campaign.recipients;
      } catch (e) {
        console.error("Parse recipients error:", e);
      }
    }

    console.log("Recipients:", recipients);

    if (recipients.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: { message: "No recipients found" } });
    }

    // Get user with Gmail tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    console.log("User Gmail status:", {
      hasToken: !!user?.gmailAccessToken,
      email: user?.email,
    });

    if (!user?.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        error: { message: "Please connect your Gmail account first" },
      });
    }

    // Setup Gmail
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
        let personalizedBody = campaign.bodyHtml || campaign.bodyText || "";

        // Replace personalization fields
        Object.keys(recipient).forEach((key) => {
          if (key !== "email" && recipient[key]) {
            const regex = new RegExp(`\\[${key}\\]|{{${key}}}`, "gi");
            personalizedBody = personalizedBody.replace(regex, recipient[key]);
          }
        });

        const emailContent = [
          `From: ${campaign.fromName || user.name || "Team"} <${fromEmail}>`,
          `To: ${recipient.email}`,
          `Subject: ${campaign.subject}`,
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

        const response = await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw: encodedEmail },
        });

        console.log(`✅ Email sent to ${recipient.email}`, response.data.id);
        results.push({
          email: recipient.email,
          status: "sent",
          messageId: response.data.id,
        });
      } catch (err) {
        console.error(`❌ Failed to send to ${recipient.email}:`, err.message);
        results.push({
          email: recipient.email,
          status: "failed",
          error: err.message,
        });
      }

      // Delay between emails
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Update campaign with results
    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: sentCount > 0 ? "sent" : "failed",
        sentCount: sentCount,
        failedCount: failedCount,
        totalRecipients: recipients.length,
        completedAt: new Date(),
      },
    });

    console.log(
      `📊 Campaign complete: Sent=${sentCount}, Failed=${failedCount}`,
    );

    res.json({
      success: true,
      data: {
        campaignId,
        summary: {
          total: recipients.length,
          sent: sentCount,
          failed: failedCount,
          skipped:
            recipients.length > MAX_EMAILS ? recipients.length - MAX_EMAILS : 0,
        },
        details: results,
      },
    });
  } catch (error) {
    console.error("Send campaign error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to send campaign" },
    });
  }
};

const getResults = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    let recipients = [];
    if (campaign?.recipients) {
      try {
        recipients = JSON.parse(campaign.recipients);
      } catch (e) {}
    }

    res.json({
      success: true,
      data: { campaign, recipients },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { sendCampaign, getResults };
