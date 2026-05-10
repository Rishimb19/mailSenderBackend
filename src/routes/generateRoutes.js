// src/routes/generateRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  generateEmail,
  suggestFieldsFromSubject,
  regenerate,
} = require("../controllers/generateController");

// All routes require authentication
router.use(verifyToken);

// Generate email body
router.post("/email-body", generateEmail);

// Suggest fields from subject
router.post("/suggest-fields", suggestFieldsFromSubject);

// Regenerate email with feedback
router.post("/regenerate", regenerate);

module.exports = router;
