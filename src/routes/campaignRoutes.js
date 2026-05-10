// src/routes/campaignRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} = require("../controllers/campaignController");

router.use(verifyToken);

router.get("/", getCampaigns);
router.get("/:id", getCampaign);
router.post("/", createCampaign);
router.put("/:id", updateCampaign);
router.delete("/:id", deleteCampaign);

module.exports = router;
