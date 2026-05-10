// src/controllers/gmailAuthController.js
const { google } = require("googleapis");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const getAuthUrl = async (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.send"],
      prompt: "consent",
    });

    res.json({
      success: true,
      data: { url: authUrl },
    });
  } catch (error) {
    console.error("Get auth URL error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to generate auth URL" },
    });
  }
};

const saveTokens = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { message: "Authorization code is required" },
      });
    }

    const { tokens } = await oauth2Client.getToken(code);

    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: new Date(Date.now() + (tokens.expiry_date || 0)),
      },
    });

    res.json({
      success: true,
      message: "Gmail connected successfully",
    });
  } catch (error) {
    console.error("Save tokens error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to connect Gmail: " + error.message },
    });
  }
};

const disconnect = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
      },
    });

    res.json({
      success: true,
      message: "Gmail disconnected successfully",
    });
  } catch (error) {
    console.error("Disconnect error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to disconnect Gmail" },
    });
  }
};

const getGmailStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        gmailAccessToken: true,
        email: true,
      },
    });

    res.json({
      success: true,
      data: {
        connected: !!user?.gmailAccessToken,
        email: user?.email,
      },
    });
  } catch (error) {
    console.error("Get Gmail status error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

module.exports = { getAuthUrl, saveTokens, disconnect, getGmailStatus };
