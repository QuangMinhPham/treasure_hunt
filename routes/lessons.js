const express = require("express");
const router = express.Router();
const { db } = require("../config/db");

// ✅ Lấy danh sách tất cả các bài học
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT chapter_id, title, description FROM chapters ORDER BY order_index ASC"
    );
    res.json({ lessons: rows });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách bài học:", err);
    res.status(500).json({ error: "Không thể lấy danh sách bài học" });
  }
});

module.exports = router;
