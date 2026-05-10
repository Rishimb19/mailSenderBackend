// src/routes/validateRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  validateEmails,
  validateSingle,
} = require("../controllers/validateController");

router.use(verifyToken);
router.post("/emails", validateEmails);
router.post("/single", validateSingle);

module.exports = router;
