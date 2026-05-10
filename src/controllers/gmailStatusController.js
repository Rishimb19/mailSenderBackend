// src/controllers/gmailStatusController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getGmailStatus };
