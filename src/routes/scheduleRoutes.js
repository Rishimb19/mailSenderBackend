// src/routes/scheduleRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  scheduleCampaign,
  getScheduledCampaigns,
  cancelSchedule,
} = require("../controllers/scheduleController");

router.use(verifyToken);

router.post("/:campaignId/schedule", scheduleCampaign);
router.get("/scheduled", getScheduledCampaigns);
router.delete("/:campaignId/schedule", cancelSchedule);

module.exports = router;
