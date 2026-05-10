// src/routes/sendRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  sendCampaign,
  getResults,
} = require("../controllers/sendCampaignController");

router.use(verifyToken);
router.post("/campaign/:campaignId", sendCampaign);
router.get("/campaign/:campaignId/results", getResults);

module.exports = router;
