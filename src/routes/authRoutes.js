// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require("../controllers/authController");
const { verifyToken } = require("../middlewares/auth");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get('/me', verifyToken, getMe);  // Make sure this exists

// Protected routes (require authentication)
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);

module.exports = router;
