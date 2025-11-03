const { db } = require("../config/db");

// --- Lấy challenge dạng matching ---
const getMatchingChallenge = async (req, res) => {
  try {
    const { chapter_id } = req.params;

    // Lấy challenge dạng matching của chapter này
    const [challenges] = await db.query(
      "SELECT * FROM challenges WHERE chapter_id = ? AND type = 'matching' LIMIT 1",
      [chapter_id]
    );

    if (challenges.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy thử thách dạng matching trong chương này." });
    }

    const challenge = challenges[0];

    // Lấy tất cả questions và matching_pairs của challenge
    const [questions] = await db.query(
      "SELECT * FROM questions WHERE challenge_id = ?",
      [challenge.challenge_id]
    );

    for (let q of questions) {
      const [pairs] = await db.query(
        "SELECT * FROM matching_pairs WHERE question_id = ?",
        [q.question_id]
      );
      q.pairs = pairs;
    }

    res.json({
      challenge_id: challenge.challenge_id,
      title: challenge.title,
      description: challenge.description,
      questions,
    });
  } catch (err) {
    console.error("❌ Lỗi getMatchingChallenge:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMatchingChallenge };
