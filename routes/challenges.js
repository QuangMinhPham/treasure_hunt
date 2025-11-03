const express = require("express");
const router = express.Router();
const { db } = require("../config/db");

// Lấy danh sách câu hỏi dạng quiz cho 1 chương
router.get("/:chapter_id", async (req, res) => {
  try {
    const chapterId = req.params.chapter_id;

    // Lấy challenge_id của dạng quiz
    const [challenge] = await db.query(
      "SELECT challenge_id FROM challenges WHERE chapter_id = ? AND type = 'quiz' LIMIT 1",
      [chapterId]
    );

    if (!challenge.length) return res.json({ questions: [] });

    const challengeId = challenge[0].challenge_id;

    // Lấy các câu hỏi của dạng quiz
    const [questions] = await db.query(
      "SELECT question_id, question_text FROM questions WHERE challenge_id = ?",
      [challengeId]
    );

    const result = [];
    for (const q of questions) {
      const [opts] = await db.query(
        "SELECT option_text, is_correct FROM options WHERE question_id = ?",
        [q.question_id]
      );
      result.push({
        id: q.question_id,
        text: q.question_text,
        options: opts.map(o => o.option_text),
        correctIndex: opts.findIndex(o => o.is_correct === 1)
      });
    }

    res.json({ questions: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể tải câu hỏi quiz" });
  }
});

module.exports = router;
