const { OAuth2Client } = require("google-auth-library");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleSignIn = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: { message: "Credential is required" },
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          password: googleId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token: token,
      },
    });
  } catch (error) {
    console.error("Google sign-in error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Google sign-in failed: " + error.message },
    });
  }
};

module.exports = { googleSignIn };
