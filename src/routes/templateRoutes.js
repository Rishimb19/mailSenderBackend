// src/routes/templateRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require("../controllers/templateController");

// All routes require authentication
router.use(verifyToken);

// GET /api/templates - Get all templates
router.get("/", getTemplates);

// GET /api/templates/:id - Get single template
router.get("/:id", getTemplate);

// POST /api/templates - Create template
router.post("/", createTemplate);

// PUT /api/templates/:id - Update template
router.put("/:id", updateTemplate);

// DELETE /api/templates/:id - Delete template
router.delete("/:id", deleteTemplate);

module.exports = router;
