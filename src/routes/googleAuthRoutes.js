const express = require("express");
const router = express.Router();
const { googleSignIn } = require("../controllers/googleAuthController");

router.post("/", googleSignIn);

module.exports = router;
