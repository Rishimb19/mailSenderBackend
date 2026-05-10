// src/controllers/campaignController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getCampaigns = async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: { campaigns } });
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

const getCampaign = async (req, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: "Campaign not found" },
      });
    }
    res.json({ success: true, data: { campaign } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

const createCampaign = async (req, res) => {
  try {
    const { recipients, ...rest } = req.body;

    const campaignData = {
      userId: req.user.id,
      name: rest.name || "Untitled Campaign",
      subject: rest.subject || "",
      fromName: rest.fromName || "",
      tone: rest.tone || "formal",
      bodyHtml: rest.bodyHtml || "",
      bodyText: rest.bodyText || "",
      status: rest.status || "draft",
      totalRecipients: recipients?.length || 0,
      // Store recipients as JSON string
      recipients: recipients ? JSON.stringify(recipients) : null,
    };

    const campaign = await prisma.campaign.create({
      data: campaignData,
    });

    res.status(201).json({ success: true, data: { campaign } });
  } catch (error) {
    console.error("Create campaign error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const { recipients, ...rest } = req.body;
    const updateData = { ...rest };

    if (recipients) {
      updateData.recipients = JSON.stringify(recipients);
      updateData.totalRecipients = recipients.length;
    }

    await prisma.campaign.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: updateData,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Update campaign error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    await prisma.campaign.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete campaign error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
