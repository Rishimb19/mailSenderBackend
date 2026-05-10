// src/controllers/validateController.js

// Simple email validation (free, no API key needed)
const validateEmails = async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: { message: "Emails array is required" },
      });
    }

    const results = emails.map((email) => {
      // Simple regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);

      // Generate a simple score
      let score = 0;
      let status = "invalid";

      if (isValid) {
        // Check domain quality
        const domain = email.split("@")[1];
        const freeDomains = [
          "gmail.com",
          "yahoo.com",
          "hotmail.com",
          "outlook.com",
        ];

        if (freeDomains.includes(domain)) {
          score = 70;
          status = "risky";
        } else if (domain.includes(".edu")) {
          score = 95;
          status = "valid";
        } else if (domain.includes(".gov")) {
          score = 98;
          status = "valid";
        } else if (
          domain.includes(".com") ||
          domain.includes(".org") ||
          domain.includes(".net")
        ) {
          score = 85;
          status = "valid";
        } else {
          score = 60;
          status = "risky";
        }
      } else {
        score = 0;
        status = "invalid";
      }

      return {
        email,
        status,
        score,
        isValid: status === "valid",
      };
    });

    res.json({
      success: true,
      data: { results },
    });
  } catch (error) {
    console.error("Validate emails error:", error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

const validateSingle = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { message: "Email is required" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    res.json({
      success: true,
      data: {
        email,
        isValid,
        message: isValid ? "Valid email format" : "Invalid email format",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

module.exports = { validateEmails, validateSingle };
