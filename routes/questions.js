const express = require("express");
const { db } = require("../config/db");
const router = express.Router();

/**
 * API: Lấy toàn bộ câu hỏi + đáp án cho một challenge cụ thể (dạng quiz)
 * GET /api/challenges/:challenge_id/questions
 */
router.get("/challenges/:challenge_id/questions", async (req, res) => {
  try {
    const { challenge_id } = req.params;

    // Lấy danh sách câu hỏi
    const [questions] = await db.query(
      "SELECT question_id, question_text FROM questions WHERE challenge_id = ? ORDER BY order_index ASC",
      [challenge_id]
    );

    // Lấy các options tương ứng
    for (const q of questions) {
      const [opts] = await db.query(
        "SELECT option_id, option_text, is_correct FROM options WHERE question_id = ?",
        [q.question_id]
      );
      q.options = opts;
    }

    res.json({
      challenge_id,
      total_questions: questions.length,
      questions,
    });
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu câu hỏi:", err);
    res.status(500).json({ error: "Lỗi server khi lấy câu hỏi" });
  }
});

module.exports = router;
