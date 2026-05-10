// src/controllers/templateController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all templates for a user
const getTemplates = async (req, res) => {
  try {
    const userId = req.user.id;

    const templates = await prisma.template.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to fetch templates" },
    });
  }
};

// Get single template
const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const template = await prisma.template.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { message: "Template not found" },
      });
    }

    res.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error("Get template error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to fetch template" },
    });
  }
};

// Create a new template
const createTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, subject, fromName, tone, keywords, bodyHtml, bodyText } =
      req.body;

    if (!name || !subject) {
      return res.status(400).json({
        success: false,
        error: { message: "Name and subject are required" },
      });
    }

    // In templateController.js, ensure keywords is properly stored
    const template = await prisma.template.create({
      data: {
        userId,
        name,
        subject,
        fromName: fromName || "",
        tone: tone || "formal",
        keywords: keywords ? JSON.stringify(keywords) : null, // This is correct
        bodyHtml: bodyHtml || "",
        bodyText: bodyText || "",
      },
    });

    res.status(201).json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error("Create template error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to create template" },
    });
  }
};

// Update a template
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, subject, fromName, tone, keywords, bodyHtml, bodyText } =
      req.body;

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.template.findFirst({
      where: { id, userId },
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: { message: "Template not found" },
      });
    }

    const template = await prisma.template.update({
      where: { id },
      data: {
        name: name || existingTemplate.name,
        subject: subject || existingTemplate.subject,
        fromName: fromName !== undefined ? fromName : existingTemplate.fromName,
        tone: tone || existingTemplate.tone,
        keywords: keywords
          ? JSON.stringify(keywords)
          : existingTemplate.keywords,
        bodyHtml: bodyHtml !== undefined ? bodyHtml : existingTemplate.bodyHtml,
        bodyText: bodyText !== undefined ? bodyText : existingTemplate.bodyText,
      },
    });

    res.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error("Update template error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to update template" },
    });
  }
};

// Delete a template
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.template.findFirst({
      where: { id, userId },
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: { message: "Template not found" },
      });
    }

    await prisma.template.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Delete template error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to delete template" },
    });
  }
};

module.exports = {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
