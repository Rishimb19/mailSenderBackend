// src/controllers/sendController.js
const { google } = require("googleapis");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const sendCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, error: { message: "Campaign not found" } });
    }

    // Parse recipients from JSON string
    let recipients = [];
    if (campaign.recipients) {
      try {
        recipients = JSON.parse(campaign.recipients);
      } catch (e) {
        recipients = [];
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        error: { message: "Please connect your Gmail account first" },
      });
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending" },
    });

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

    const results = [];
    const MAX_EMAILS = 5;
    const emailsToSend = recipients.slice(0, MAX_EMAILS);

    for (const recipient of emailsToSend) {
      try {
        let personalizedBody = campaign.bodyHtml || campaign.bodyText || "";

        Object.keys(recipient).forEach((key) => {
          if (key !== "email" && recipient[key]) {
            const regex = new RegExp(`\\[${key}\\]|{{${key}}}`, "gi");
            personalizedBody = personalizedBody.replace(regex, recipient[key]);
          }
        });

        const emailContent = [
          `From: ${campaign.fromName || user.name || "Team"} <${user.email}>`,
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

        await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw: encodedEmail },
        });

        results.push({ email: recipient.email, status: "sent" });
      } catch (err) {
        results.push({
          email: recipient.email,
          status: "failed",
          error: err.message,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Update campaign with results
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "sent",
        sentCount: results.filter((r) => r.status === "sent").length,
        failedCount: results.filter((r) => r.status === "failed").length,
        totalRecipients: recipients.length,
        completedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: recipients.length,
          sent: results.filter((r) => r.status === "sent").length,
          failed: results.filter((r) => r.status === "failed").length,
        },
        details: results,
      },
    });
  } catch (error) {
    console.error("Send campaign error:", error);
    res.status(500).json({ success: false, error: { message: error.message } });
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
      } catch (e) {
        recipients = [];
      }
    }

    res.json({
      success: true,
      data: {
        campaign,
        recipients,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { sendCampaign, getResults };
