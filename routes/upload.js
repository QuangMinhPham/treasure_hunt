const express = require("express");
const { upload, uploadDocx } = require("../controllers/upload_controller");

const router = express.Router();

router.post("/", upload.single("file"), uploadDocx);

module.exports = router;
