// src/routes/googleSignInRoutes.js
const express = require("express");
const router = express.Router();
const { googleSignIn } = require("../controllers/googleSignInController");

router.post("/", googleSignIn);

module.exports = router;
