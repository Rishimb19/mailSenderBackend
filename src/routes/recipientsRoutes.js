// src/routes/recipientsRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  parseFile,
  validateFields,
  uploadMiddleware,
} = require("../controllers/recipientsController");

router.use(verifyToken);

// Parse uploaded file
router.post("/parse-file", uploadMiddleware, parseFile);

// Validate recipient fields
router.post("/validate-fields", validateFields);

module.exports = router;
