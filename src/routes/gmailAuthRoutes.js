// src/routes/gmailAuthRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  getAuthUrl,
  saveTokens,
  disconnect,
  getGmailStatus,
} = require("../controllers/gmailAuthController");

// All routes require authentication
router.use(verifyToken);

router.get("/auth-url", getAuthUrl);
router.post("/save-tokens", saveTokens);
router.post("/disconnect", disconnect);
router.get("/status", getGmailStatus);

module.exports = router;
