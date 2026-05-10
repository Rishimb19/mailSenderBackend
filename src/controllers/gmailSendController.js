// src/controllers/gmailSendController.js
const { google } = require("googleapis");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const getGmailAuthUrl = async (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.send"],
      prompt: "consent",
    });
    res.json({ success: true, data: { url: authUrl } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const saveGmailTokens = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    const { tokens } = await oauth2Client.getToken(code);

    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: new Date(Date.now() + (tokens.expiry_date || 0)),
      },
    });
    res.json({ success: true, message: "Gmail connected successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getGmailStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { gmailAccessToken: true, email: true },
    });
    res.json({
      success: true,
      data: { connected: !!user?.gmailAccessToken, email: user?.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const disconnectGmail = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
      },
    });
    res.json({ success: true, message: "Gmail disconnected" });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const sendTestEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { to, subject, body } = req.body;

    console.log("📧 Sending test email to:", to);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        error: { message: "Gmail not connected" },
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

    const emailContent = [
      `From: ${user.email}`,
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

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedEmail },
    });

    console.log("✅ Test email sent, messageId:", response.data.id);

    res.json({
      success: true,
      messageId: response.data.id,
      message: "Test email sent successfully!",
    });
  } catch (error) {
    console.error("❌ Test email error:", error.message);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

// EXPORT ALL FUNCTIONS AT THE BOTTOM - THIS IS WHERE IT GOES
module.exports = {
  getGmailAuthUrl,
  saveGmailTokens,
  getGmailStatus,
  disconnectGmail,
  sendTestEmail,
};
