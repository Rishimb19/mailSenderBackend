// src/controllers/generateController.js
const {
  generateEmailBody,
  suggestFields,
  regenerateEmail,
} = require("../ai/emailGenerator");

const generateEmail = async (req, res) => {
  try {
    const { subject, tone, selectedFields, ...fieldValues } = req.body;

    console.log("📨 Generate request received:", {
      subject,
      tone,
      selectedFields,
      fieldValues,
    });

    if (!subject) {
      return res.status(400).json({
        success: false,
        error: { message: "Subject is required" },
      });
    }

    const result = await generateEmailBody({
      subject,
      tone: tone || "formal",
      selectedFields: selectedFields || [],
      fieldValues,
    });

    console.log("✅ Generation successful, sending response");
    console.log("Body text length:", result.bodyText?.length);

    // Send response in the format frontend expects
    res.json({
      success: true,
      data: {
        bodyText: result.bodyText,
        bodyHtml: result.bodyHtml,
      },
    });
  } catch (error) {
    console.error("❌ Generate error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to generate email" },
    });
  }
};

const suggestFieldsFromSubject = async (req, res) => {
  try {
    const { subject } = req.body;

    console.log("🔍 Suggest fields request:", subject);

    if (!subject) {
      return res.status(400).json({
        success: false,
        error: { message: "Subject is required" },
      });
    }

    const suggestedFields = await suggestFields(subject);

    res.json({
      success: true,
      data: {
        suggestedFields,
      },
    });
  } catch (error) {
    console.error("❌ Suggest fields error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to suggest fields" },
    });
  }
};

const regenerate = async (req, res) => {
  try {
    const { previousBody, subject, tone, feedback, fieldValues } = req.body;

    console.log("🔄 Regenerate request:", { subject, tone, feedback });

    if (!previousBody || !subject) {
      return res.status(400).json({
        success: false,
        error: { message: "Previous body and subject are required" },
      });
    }

    const result = await regenerateEmail({
      previousBody,
      subject,
      tone: tone || "formal",
      feedback: feedback || "Make it better",
      fieldValues: fieldValues || {},
    });

    res.json({
      success: true,
      data: {
        bodyText: result.bodyText,
        bodyHtml: result.bodyHtml,
      },
    });
  } catch (error) {
    console.error("❌ Regenerate error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message || "Failed to regenerate email" },
    });
  }
};

module.exports = {
  generateEmail,
  suggestFieldsFromSubject,
  regenerate,
};
