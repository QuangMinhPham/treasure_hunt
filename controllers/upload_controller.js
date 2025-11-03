// const multer = require("multer");
// const mammoth = require("mammoth");
// const { db } = require("../config/db");

// // --- Cấu hình Multer (lưu file vào thư mục /uploads)
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/"),
//   filename: (req, file, cb) => {
//     const unique = Date.now() + "-" + file.originalname;
//     cb(null, unique);
//   },
// });

// const upload = multer({ storage });

// // --- Hàm chính xử lý upload file DOCX ---
// const uploadDocx = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "Không có file nào được tải lên" });
//     }

//     const { value } = await mammoth.extractRawText({ path: req.file.path });
//     const lines = value.split("\n").map(l => l.trim()).filter(l => l !== "");

//     let currentChapter = null;
//     let currentChallenge = null;
//     let mode = null; // quiz | matching | short
//     let questionBuffer = [];
//     let currentQuestion = "";

//     for (let line of lines) {
//       // --- Nhận diện Bài học ---
//       if (line.match(/^Bài\s+\d+/i)) {
//         const title = line;
//         const [result] = await db.query(
//           "INSERT INTO chapters (title, description, order_index) VALUES (?, ?, ?)",
//           [title, null, 1]
//         );
//         currentChapter = result.insertId;
//         continue;
//       }

//       // --- Dạng 1: Trắc nghiệm ---
//       if (line.startsWith("Dạng 1")) {
//         const [result] = await db.query(
//           "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'quiz', ?, 1)",
//           [currentChapter, line, "Chọn đáp án đúng trong 4 lựa chọn"]
//         );
//         currentChallenge = result.insertId;
//         mode = "quiz";
//         continue;
//       }

//       // --- Dạng 2: Nối ---
//       if (line.startsWith("Dạng 2")) {
//         const [result] = await db.query(
//           "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'matching', ?, 2)",
//           [currentChapter, line, "Nối các khái niệm tương ứng giữa 2 cột"]
//         );
//         currentChallenge = result.insertId;
//         mode = "matching";
//         continue;
//       }

//       // --- Dạng 3: Trả lời ngắn ---
//       if (line.startsWith("Dạng 3")) {
//         const [result] = await db.query(
//           "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'short_answer', ?, 3)",
//           [currentChapter, line, "Trả lời ngắn gọn"]
//         );
//         currentChallenge = result.insertId;
//         mode = "short";
//         continue;
//       }

//       // --- Xử lý từng dạng ---
//       // Dạng quiz
//       if (mode === "quiz") {
//         const quizMatch = line.match(/^Câu\s*\d+:\s*(.+)/i);
//         if (quizMatch) {
//           if (questionBuffer.length > 0) await saveQuizQuestion(currentChallenge, questionBuffer);
//           questionBuffer = [quizMatch[1]];
//           continue;
//         }

//         if (line.match(/^[ABCD]\./)) {
//           questionBuffer.push(line);
//           continue;
//         }

//         if (line.startsWith("Đáp án:")) {
//           questionBuffer.push(line);
//           await saveQuizQuestion(currentChallenge, questionBuffer);
//           questionBuffer = [];
//         }
//       }

//       // Dạng matching
//       if (mode === "matching") {
//         const matchLine = line.match(/^([A-Z])\.\s*(.+?)\s*[-–]\s*(.+)$/);
//         if (matchLine) {
//           const [_, label, leftText, rightText] = matchLine;
//           const [qRes] = await db.query(
//             "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
//             [currentChallenge, `Cặp ${label}`]
//           );
//           const qId = qRes.insertId;

//           await db.query(
//             "INSERT INTO matching_pairs (question_id, left_text, right_text, correct_match) VALUES (?, ?, ?, ?)",
//             [qId, leftText.trim(), rightText.trim(), `${label.toLowerCase()}-${label.toLowerCase()}`]
//           );
//         }
//       }

//       // Dạng short answer
//       if (mode === "short") {
//         const shortMatch = line.match(/^Câu\s*\d+:\s*(.+)/i);
//         if (shortMatch) {
//           currentQuestion = shortMatch[1];
//           continue;
//         }
//         if (line.startsWith("Đáp án:")) {
//           const answer = line.replace("Đáp án:", "").trim();
//           const [qRes] = await db.query(
//             "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
//             [currentChallenge, currentQuestion]
//           );
//           const qId = qRes.insertId;
//           await db.query(
//             "INSERT INTO short_answers (question_id, correct_answer) VALUES (?, ?)",
//             [qId, answer]
//           );
//         }
//       }
//     }

//     res.json({ message: "✅ Import thành công!" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

// // === HÀM PHỤ ===
// async function saveQuizQuestion(challengeId, lines) {
//   const questionText = lines[0];
//   const options = lines.slice(1, -1);
//   const correctLine = lines[lines.length - 1];
//   const correctLetter = correctLine.split(":")[1].trim();

//   const [qRes] = await db.query(
//     "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
//     [challengeId, questionText]
//   );
//   const qId = qRes.insertId;

//   for (let opt of options) {
//     const letter = opt.charAt(0);
//     const text = opt.substring(3).trim();
//     const isCorrect = letter === correctLetter;
//     await db.query(
//       "INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)",
//       [qId, text, isCorrect]
//     );
//   }
// }

// module.exports = { upload, uploadDocx };

const multer = require("multer");
const mammoth = require("mammoth");
const { db } = require("../config/db");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

const uploadDocx = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Không có file nào được tải lên" });

    const { value } = await mammoth.extractRawText({ path: req.file.path });
    const cleanText = value.replace(/\r/g, "").replace(/\t/g, "").trim();

    // 🧩 Chia toàn bộ file thành từng "Bài x: ..."
    const chapters = cleanText.split(/(?=Bài\s*\d+)/i).filter(b => b.trim().length > 0);

    for (const chapter of chapters) {
      const chapterTitleMatch = chapter.match(/Bài\s*\d+[:：]?\s*(.+)?/i);
      const chapterTitle = chapterTitleMatch ? chapterTitleMatch[0].trim() : "Bài không rõ tên";
      const [chapterRes] = await db.query(
        "INSERT INTO chapters (title, description, order_index) VALUES (?, ?, ?)",
        [chapterTitle, null, 1]
      );
      const chapterId = chapterRes.insertId;

      // 🧠 Cắt từng dạng trong mỗi bài
      const parts = chapter.split(/(?=Dạng\s*\d+)/i);

      for (const part of parts) {
        if (part.startsWith("Dạng 1")) {
          const [challengeRes] = await db.query(
            "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'quiz', ?, 1)",
            [chapterId, "Dạng 1", "Trắc nghiệm chọn đáp án"]
          );
          await parseQuiz(part, challengeRes.insertId);
        }

        else if (part.startsWith("Dạng 2")) {
          const [challengeRes] = await db.query(
            "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'matching', ?, 2)",
            [chapterId, "Dạng 2", "Nối cặp tương ứng"]
          );
          await parseMatching(part, challengeRes.insertId);
        }

        else if (part.startsWith("Dạng 3")) {
          const [challengeRes] = await db.query(
            "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'short_answer', ?, 3)",
            [chapterId, "Dạng 3", "Trả lời ngắn"]
          );
          await parseShort(part, challengeRes.insertId);
        }
      }
    }

    res.json({ message: "✅ Đọc đầy đủ 21 bài thành công!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// === HÀM PHỤ ===

async function parseQuiz(text, challengeId) {
  const questions = text.split(/Câu\s*\d+[:：]/i).slice(1);

  for (const q of questions) {
    const [questionPart, ...rest] = q.trim().split(/\n/);
    const questionText = questionPart.trim();
    const optionMatches = q.match(/[ABCD]\.\s*.+/g) || [];
    const answerMatch = q.match(/Đáp án[:：]?\s*([A-D])/i);
    const correct = answerMatch ? answerMatch[1].toUpperCase() : null;

    const [qRes] = await db.query(
      "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
      [challengeId, questionText]
    );
    const qId = qRes.insertId;

    for (const opt of optionMatches) {
      const letter = opt.trim()[0];
      const textOpt = opt.substring(2).trim();
      await db.query(
        "INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)",
        [qId, textOpt, letter === correct]
      );
    }
  }
}

async function parseMatching(text, challengeId) {
  // Tìm các dòng “trái | phải”
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  const pairLines = lines.filter(l => l.includes("|") && !l.startsWith("Hòm"));
  const answerLines = lines.filter(l => /\d+\s*[-–]\s*[a-z]/i.test(l));

  const [qRes] = await db.query(
    "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
    [challengeId, "Câu nối tương ứng"]
  );
  const qId = qRes.insertId;

  const pairs = pairLines.map(line => {
    const [left, right] = line.split("|").map(s => s.trim());
    return { left, right };
  });

  const answers = answerLines.map(line => {
    const match = line.match(/(\d+)\s*[-–]\s*([a-z])/i);
    return match ? { index: parseInt(match[1]) - 1, match: match[2] } : null;
  }).filter(Boolean);

  for (let i = 0; i < pairs.length; i++) {
    const correctMatch = answers.find(a => a.index === i)?.match || "";
    await db.query(
      "INSERT INTO matching_pairs (question_id, left_text, right_text, correct_match) VALUES (?, ?, ?, ?)",
      [qId, pairs[i].left, pairs[i].right, correctMatch]
    );
  }
}

async function parseShort(text, challengeId) {
  const questions = text.split(/Câu\s*\d+[:：]/i).slice(1);

  for (const q of questions) {
    const lines = q.split("\n").map(l => l.trim()).filter(l => l);
    const questionText = lines[0];
    const ansMatch = q.match(/Đáp án[:：]?\s*(.+)/i);
    const answer = ansMatch ? ansMatch[1].trim() : "";

    const [qRes] = await db.query(
      "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
      [challengeId, questionText]
    );
    const qId = qRes.insertId;
    await db.query(
      "INSERT INTO short_answers (question_id, correct_answer) VALUES (?, ?)",
      [qId, answer]
    );
  }
}

module.exports = { upload, uploadDocx };
