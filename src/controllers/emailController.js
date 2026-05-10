// src/controllers/emailController.js
const { sendBulkEmails } = require("../services/emailSender");
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
      return res.status(404).json({
        success: false,
        error: { message: "Campaign not found" },
      });
    }

    // Get recipients from campaign
    let recipients = [];
    if (campaign.recipients) {
      try {
        recipients =
          typeof campaign.recipients === "string"
            ? JSON.parse(campaign.recipients)
            : campaign.recipients;
      } catch (e) {
        recipients = [];
      }
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "No recipients found for this campaign" },
      });
    }

    // Update status to sending
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending" },
    });

    // Send emails
    const result = await sendBulkEmails(
      userId,
      campaignId,
      campaign.subject,
      campaign.bodyHtml || campaign.bodyText,
      recipients,
      campaign.fromName || req.user.name || "Team",
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Send campaign error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to send campaign" },
    });
  }
};

const getCampaignResults = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: "Campaign not found" },
      });
    }

    let recipients = [];
    if (campaign.recipients) {
      try {
        recipients =
          typeof campaign.recipients === "string"
            ? JSON.parse(campaign.recipients)
            : campaign.recipients;
      } catch (e) {
        recipients = [];
      }
    }

    res.json({
      success: true,
      data: {
        campaign,
        recipients: recipients.map((r) => ({
          email: r.email,
          status: r.status || "pending",
          error: r.error,
        })),
      },
    });
  } catch (error) {
    console.error("Get results error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get results" },
    });
  }
};

module.exports = { sendCampaign, getCampaignResults };
