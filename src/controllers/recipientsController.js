// src/controllers/recipientsController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Parse CSV/Excel file
const parseFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: "No file uploaded" },
      });
    }

    const fileContent = fs.readFileSync(req.file.path, "utf8");
    const lines = fileContent.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const emailColumn = headers.find(
      (h) => h === "email" || h === "email_address",
    );

    if (!emailColumn) {
      return res.status(400).json({
        success: false,
        error: { message: "File must contain an email column" },
      });
    }

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(",");
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index]?.trim() || "";
      });
      records.push(record);
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: {
        records,
        emailColumn,
        total: records.length,
      },
    });
  } catch (error) {
    console.error("Parse file error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to parse file: " + error.message },
    });
  }
};

// Validate required fields for recipients
const validateFields = async (req, res) => {
  try {
    const { recipients, requiredFields = [] } = req.body;

    if (!recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: { message: "Recipients array is required" },
      });
    }

    const results = recipients.map((recipient, index) => {
      const missingFields = [];

      requiredFields.forEach((field) => {
        if (!recipient[field] || recipient[field].trim() === "") {
          missingFields.push(field);
        }
      });

      return {
        index,
        email: recipient.email || recipient.email_address,
        isComplete: missingFields.length === 0,
        missingFields,
      };
    });

    res.json({
      success: true,
      data: { results },
    });
  } catch (error) {
    console.error("Validate fields error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

// Multer middleware for file upload
const uploadMiddleware = upload.single("file");

module.exports = { parseFile, validateFields, uploadMiddleware };
