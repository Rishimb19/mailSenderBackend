// src/routes/gmailSendRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  getGmailAuthUrl,
  saveGmailTokens,
  getGmailStatus,
  disconnectGmail,
  sendTestEmail,
} = require("../controllers/gmailSendController");

router.use(verifyToken);
router.get("/auth-url", getGmailAuthUrl);
router.post("/save-tokens", saveGmailTokens);
router.get("/status", getGmailStatus);
router.post("/disconnect", disconnectGmail);
router.post("/test-send", sendTestEmail);

module.exports = router;
