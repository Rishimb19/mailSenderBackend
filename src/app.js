// src/app.js
const express = require("express");
const cors = require("cors");
const campaignRoutes = require("./routes/campaignRoutes");
const authRoutes = require("./routes/authRoutes");
const generateRoutes = require("./routes/generateRoutes");
const templateRoutes = require("./routes/templateRoutes");
const recipientsRoutes = require("./routes/recipientsRoutes");
const validateRoutes = require("./routes/validateRoutes");
const sendRoutes = require("./routes/sendRoutes");
const googleSignInRoutes = require("./routes/googleSignInRoutes");
const gmailSendRoutes = require("./routes/gmailSendRoutes"); // Only ONE
const scheduleRoutes = require("./routes/scheduleRoutes"); // ADD THIS LINE

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth/google", googleSignInRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/recipients", recipientsRoutes);
app.use("/api/validate", validateRoutes);
app.use("/api/send", sendRoutes);
app.use("/api/gmail", gmailSendRoutes);
app.use("/api/schedule", scheduleRoutes); // ADD THIS LINE

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.url} not found` },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    success: false,
    error: { message: err.message || "Internal server error" },
  });
});

module.exports = app;
