const express = require('express');
const router = express.Router();
const { db } = require('../config/db');

/**
 * GET /api/challenges/:chapter_id/matching
 * Trả về danh sách matching pairs cho chapter_id
 * Kết cấu trả về:
 * {
 *   chapter_id: 1,
 *   challenge_id: 12,
 *   questions: [
 *     {
 *       question_id, question_text,
 *       pairs: [{ pair_id, left_text, left_image_url, right_text, right_image_url, correct_match }]
 *     }, ...
 *   ]
 * }
 */
router.get('/challenges/:chapter_id/matching', async (req, res) => {
  try {
    const chapterId = req.params.chapter_id;

    // Lấy challenge matching của chương
    const [chRows] = await db.query(
      "SELECT challenge_id FROM challenges WHERE chapter_id = ? AND type = 'matching' LIMIT 1",
      [chapterId]
    );
    if (!chRows.length) return res.json({ chapter_id: chapterId, questions: [] });

    const challengeId = chRows[0].challenge_id;

    // Lấy tất cả các câu hỏi thuộc challenge này
    const [qRows] = await db.query(
      "SELECT question_id, question_text FROM questions WHERE challenge_id = ?",
      [challengeId]
    );

    const questions = [];
    for (const q of qRows) {
      const [pairs] = await db.query(
        "SELECT pair_id, left_text, left_image_url, right_text, right_image_url, correct_match FROM matching_pairs WHERE question_id = ?",
        [q.question_id]
      );

      questions.push({
        question_id: q.question_id,
        question_text: q.question_text,
        pairs: pairs.map(p => ({
          pair_id: p.pair_id,
          left_text: p.left_text,
          left_image_url: p.left_image_url,
          right_text: p.right_text,
          right_image_url: p.right_image_url,
          correct_match: p.correct_match // lưu trực tiếp
        }))
      });
    }

    res.json({
      chapter_id: chapterId,
      challenge_id: challengeId,
      questions
    });
  } catch (err) {
    console.error('Lỗi lấy matching pairs:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy matching pairs' });
  }
});

module.exports = router;
