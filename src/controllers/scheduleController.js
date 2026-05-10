// src/controllers/scheduleController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { sendBulkEmails } = require("../services/emailSender");

// Schedule a campaign
const scheduleCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { scheduledFor, isRecurring, recurringPattern } = req.body;
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

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: { message: "Scheduled time must be in the future" },
      });
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        scheduledFor: scheduledDate,
        status: "scheduled",
        isRecurring: isRecurring || false,
        recurringPattern: recurringPattern || null,
      },
    });

    res.json({
      success: true,
      message: `Campaign scheduled for ${scheduledDate.toLocaleString()}`,
      data: { campaign: updatedCampaign },
    });
  } catch (error) {
    console.error("Schedule campaign error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

// Get all scheduled campaigns
const getScheduledCampaigns = async (req, res) => {
  try {
    const userId = req.user.id;

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId,
        status: "scheduled",
        scheduledFor: {
          gte: new Date(),
        },
      },
      orderBy: { scheduledFor: "asc" },
    });

    res.json({
      success: true,
      data: { campaigns },
    });
  } catch (error) {
    console.error("Get scheduled campaigns error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

// Cancel scheduled campaign
const cancelSchedule = async (req, res) => {
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

    if (campaign.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        error: { message: "Campaign is not scheduled" },
      });
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        scheduledFor: null,
        status: "draft",
        isRecurring: false,
        recurringPattern: null,
      },
    });

    res.json({
      success: true,
      message: "Schedule cancelled",
    });
  } catch (error) {
    console.error("Cancel schedule error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

// Process scheduled campaigns (called by cron job)
const processScheduledCampaigns = async () => {
  try {
    console.log(
      "🕐 Checking for scheduled campaigns...",
      new Date().toISOString(),
    );

    const now = new Date();

    // Find campaigns scheduled for now or earlier that haven't been sent
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: "scheduled",
        scheduledFor: {
          lte: now,
        },
        OR: [
          { lastSentAt: null }, // Never sent
          { isRecurring: true }, // Recurring campaigns
        ],
      },
    });

    console.log(`📧 Found ${campaigns.length} campaigns to process`);

    for (const campaign of campaigns) {
      try {
        console.log(`Processing campaign: ${campaign.id} - ${campaign.name}`);

        // Parse recipients
        let recipients = [];
        if (campaign.recipients) {
          try {
            recipients = JSON.parse(campaign.recipients);
          } catch (e) {
            console.error("Parse recipients error:", e);
          }
        }

        if (recipients.length === 0) {
          console.log(`No recipients for campaign ${campaign.id}, skipping`);
          continue;
        }

        // Send emails
        const result = await sendBulkEmails(
          campaign.userId,
          campaign.id,
          campaign.subject,
          campaign.bodyHtml || campaign.bodyText,
          recipients,
          campaign.fromName || "Team",
        );

        console.log(`✅ Campaign ${campaign.id} sent:`, result.summary);

        // Handle recurring campaigns
        if (campaign.isRecurring && campaign.recurringPattern) {
          let nextScheduleDate = new Date();

          switch (campaign.recurringPattern) {
            case "daily":
              nextScheduleDate.setDate(nextScheduleDate.getDate() + 1);
              break;
            case "weekly":
              nextScheduleDate.setDate(nextScheduleDate.getDate() + 7);
              break;
            case "monthly":
              nextScheduleDate.setMonth(nextScheduleDate.getMonth() + 1);
              break;
            default:
              nextScheduleDate = null;
          }

          if (nextScheduleDate) {
            await prisma.campaign.update({
              where: { id: campaign.id },
              data: {
                scheduledFor: nextScheduleDate,
                lastSentAt: now,
                sentCount: 0,
                failedCount: 0,
              },
            });
            console.log(
              `🔄 Recurring campaign rescheduled for ${nextScheduleDate}`,
            );
          }
        } else {
          // Non-recurring campaign - mark as completed
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              status: "sent",
              completedAt: now,
            },
          });
        }
      } catch (error) {
        console.error(`❌ Failed to process campaign ${campaign.id}:`, error);

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: "failed",
            completedAt: now,
          },
        });
      }
    }
  } catch (error) {
    console.error("❌ Process scheduled campaigns error:", error);
  }
};

module.exports = {
  scheduleCampaign,
  getScheduledCampaigns,
  cancelSchedule,
  processScheduledCampaigns,
};
