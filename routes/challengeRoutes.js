const express = require("express");
const router = express.Router();
const { getMatchingChallenge } = require("../controllers/challengeController");

router.get("/matching/:chapter_id", getMatchingChallenge);

module.exports = router;
