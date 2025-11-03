const express = require("express");
const router = express.Router();
const { db } = require("../config/db");
const { verifyToken } = require("../middlewares/auth");

// Lưu điểm của người chơi
router.post("/save", verifyToken, async (req, res) => {
  try {
    const { chapter_id, challenge_id, score } = req.body;
    const user_id = req.user.user_id; // Lấy từ JWT

    // 1️⃣ Kiểm tra xem người chơi đã có điểm cho challenge này chưa
    const [existing] = await db.query(
      "SELECT score FROM user_progress WHERE user_id=? AND challenge_id=?",
      [user_id, challenge_id]
    );

    if (existing.length > 0) {
      // Nếu có -> chỉ update khi điểm mới cao hơn
      if (score > existing[0].score) {
        await db.query(
          "UPDATE user_progress SET score=?, completed=1, attempt_date=NOW() WHERE user_id=? AND challenge_id=?",
          [score, user_id, challenge_id]
        );
      }
    } else {
      // Nếu chưa có -> thêm mới
      await db.query(
        "INSERT INTO user_progress (user_id, chapter_id, challenge_id, score, completed) VALUES (?, ?, ?, ?, 1)",
        [user_id, chapter_id, challenge_id, score]
      );
    }

    // 2️⃣ Tính lại tổng điểm cao nhất của user trong tất cả challenge
    const [totalRes] = await db.query(`
      SELECT SUM(max_scores.max_score) AS total_score
      FROM (
        SELECT user_id, challenge_id, MAX(score) AS max_score
        FROM user_progress
        WHERE user_id=?
        GROUP BY user_id, challenge_id
      ) AS max_scores
    `, [user_id]);

    const totalScore = totalRes[0].total_score || 0;

    // 3️⃣ Cập nhật leaderboard
    const [leader] = await db.query(
      "SELECT leaderboard_id FROM leaderboard WHERE user_id=?",
      [user_id]
    );

    if (leader.length > 0) {
      await db.query(
        "UPDATE leaderboard SET total_score=?, last_updated=NOW() WHERE user_id=?",
        [totalScore, user_id]
      );
    } else {
      await db.query(
        "INSERT INTO leaderboard (user_id, total_score) VALUES (?, ?)",
        [user_id, totalScore]
      );
    }

    res.json({
      message: "✅ Điểm đã được lưu và cập nhật bảng xếp hạng!",
      total_score: totalScore
    });
  } catch (err) {
    console.error("❌ Lỗi khi lưu điểm:", err);
    res.status(500).json({ error: "Lỗi khi lưu điểm hoặc cập nhật leaderboard" });
  }
});



// ✅ Lấy leaderboard (đã có ở trên)
// 📊 Lấy danh sách bảng xếp hạng
router.get("/leaderboard", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        l.leaderboard_id,
        u.username AS player_name,
        l.total_score,
        RANK() OVER (ORDER BY l.total_score DESC) AS rank_position,
        DATE_FORMAT(l.last_updated, '%d/%m/%Y %H:%i:%s') AS last_updated
      FROM leaderboard l
      JOIN users u ON l.user_id = u.user_id
      ORDER BY l.total_score DESC, l.last_updated ASC
    `);

    res.json({
      success: true,
      leaderboard: rows
    });
  } catch (err) {
    console.error("❌ Lỗi lấy bảng xếp hạng:", err);
    res.status(500).json({ success: false, error: "Lỗi khi truy xuất leaderboard" });
  }
});




module.exports = router;
