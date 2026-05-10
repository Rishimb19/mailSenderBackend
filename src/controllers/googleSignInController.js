// src/controllers/googleSignInController.js
const { OAuth2Client } = require("google-auth-library");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleSignIn = async (req, res) => {
  try {
    const { credential } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          password: googleId,
          googleId,
          picture,
        },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email },
        token,
      },
    });
  } catch (error) {
    console.error("Google Sign-In error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Google Sign-In failed" },
    });
  }
};

module.exports = { googleSignIn };
