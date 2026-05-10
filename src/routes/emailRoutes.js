// src/routes/emailRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  sendCampaign,
  getCampaignResults,
} = require("../controllers/emailController");

router.use(verifyToken);
router.post("/send/:campaignId", sendCampaign);
router.get("/results/:campaignId", getCampaignResults);

module.exports = router;
