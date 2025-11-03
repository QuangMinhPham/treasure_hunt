import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// 🧩 Cấu hình upload file DOCX
const upload = multer({ dest: "uploads/" });

// === ROUTE UPLOAD DOCX ===
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("❌ Không có file nào được tải lên. Kiểm tra lại input name='file'");
    }

    const filePath = req.file.path;

    // 🧠 Chuyển DOCX thành text và extract hình ảnh
    const imagesDir = path.join(__dirname, "uploads/matching");
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const { value } = await mammoth.extractRawText({ path: filePath });
    const { value: html } = await mammoth.convertToHtml(
      { path: filePath },
      {
        convertImage: mammoth.images.imgElement(image => {
          return image.read("base64").then(buffer => {
            const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 9999)}.png`;
            const imgPath = path.join(imagesDir, fileName);
            fs.writeFileSync(imgPath, Buffer.from(buffer, "base64"));
            return { src: `/uploads/matching/${fileName}` };
          });
        }),
      }
    );

    console.log("📘 File Word đã được đọc, độ dài:", value.length);

    const lines = value.split("\n").map(l => l.trim()).filter(Boolean);
    let currentChapter = null;
    let currentChallenge = null;
    let mode = null; // quiz | matching | short

    let questionBuffer = [];
    let currentQuestion = "";

    for (let line of lines) {
      // === 1️⃣ BÀI (Chương) ===
      if (line.match(/^Bài\s+\d+/i)) {
        const title = line;
        const [result] = await db.query(
          "INSERT INTO chapters (title, description, order_index) VALUES (?, ?, ?)",
          [title, null, 1]
        );
        currentChapter = result.insertId;
        console.log("📖 Tạo chương mới:", title);
        continue;
      }

      // === 2️⃣ DẠNG ===
      if (line.startsWith("Dạng 1")) {
        const [result] = await db.query(
          "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'quiz', ?, 1)",
          [currentChapter, line, "Chọn đáp án đúng trong 4 lựa chọn"]
        );
        currentChallenge = result.insertId;
        mode = "quiz";
        continue;
      }

      if (line.startsWith("Dạng 2")) {
        const [result] = await db.query(
          "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'matching', ?, 2)",
          [currentChapter, line, "Nối các khái niệm tương ứng giữa 2 cột"]
        );
        currentChallenge = result.insertId;
        mode = "matching";
        continue;
      }

      if (line.startsWith("Dạng 3")) {
        const [result] = await db.query(
          "INSERT INTO challenges (chapter_id, title, type, description, order_index) VALUES (?, ?, 'short_answer', ?, 3)",
          [currentChapter, line, "Trả lời ngắn gọn"]
        );
        currentChallenge = result.insertId;
        mode = "short";
        continue;
      }

      // === 3️⃣ XỬ LÝ CÂU HỎI ===
      // 📍 QUIZ
      if (mode === "quiz") {
        const quizMatch = line.match(/^Câu\s*\d+:\s*(.+)/i);
        if (quizMatch) {
          if (questionBuffer.length > 0) {
            await saveQuizQuestion(currentChallenge, questionBuffer);
          }
          questionBuffer = [quizMatch[1]];
          continue;
        }

        if (line.match(/^[ABCD]\./)) {
          questionBuffer.push(line);
          continue;
        }

        if (line.startsWith("Đáp án:")) {
          questionBuffer.push(line);
          await saveQuizQuestion(currentChallenge, questionBuffer);
          questionBuffer = [];
          continue;
        }
      }

      // 📍 MATCHING
      if (mode === "matching") {
        // ví dụ: A. Trái đất - Earth
        const matchLine = line.match(/^([A-Z])\.\s*(.+?)\s*[-–]\s*(.+)$/);
        if (matchLine) {
          const [_, label, leftText, rightText] = matchLine;
          const [qRes] = await db.query(
            "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
            [currentChallenge, `Cặp ${label}`]
          );
          const qId = qRes.insertId;

          const leftImage = `/uploads/matching/${label.toLowerCase()}_left.png`;
          const rightImage = `/uploads/matching/${label.toLowerCase()}_right.png`;

          await db.query(
            `INSERT INTO matching_pairs (question_id, left_text, left_image_url, right_text, right_image_url, correct_match)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [qId, leftText.trim(), leftImage, rightText.trim(), rightImage, `${label.toLowerCase()}-${label.toLowerCase()}`]
          );
          console.log(`✅ Matching: ${leftText} ↔ ${rightText}`);
        }
      }

      // 📍 SHORT ANSWER
      if (mode === "short") {
        const shortMatch = line.match(/^Câu\s*\d+:\s*(.+)/i);
        if (shortMatch) {
          currentQuestion = shortMatch[1];
          continue;
        }
        if (line.startsWith("Đáp án:")) {
          const answer = line.replace("Đáp án:", "").trim();
          const [qRes] = await db.query(
            "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
            [currentChallenge, currentQuestion]
          );
          const qId = qRes.insertId;
          await db.query(
            "INSERT INTO short_answers (question_id, correct_answer) VALUES (?, ?)",
            [qId, answer]
          );
          console.log(`📝 Short Answer: ${currentQuestion} → ${answer}`);
        }
      }
    }

    fs.unlinkSync(filePath);
    res.json({ message: "✅ Import thành công tất cả dạng câu hỏi!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// === HÀM PHỤ ===
async function saveQuizQuestion(challengeId, lines) {
  const questionText = lines[0];
  const options = lines.slice(1, -1);
  const correctLine = lines[lines.length - 1];
  const correctLetter = correctLine.split(":")[1].trim();

  const [qRes] = await db.query(
    "INSERT INTO questions (challenge_id, question_text) VALUES (?, ?)",
    [challengeId, questionText]
  );
  const qId = qRes.insertId;

  for (let opt of options) {
    const letter = opt.charAt(0);
    const text = opt.substring(3).trim();
    const isCorrect = letter === correctLetter;
    await db.query(
      "INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)",
      [qId, text, isCorrect]
    );
  }
  console.log(`🎯 Quiz: ${questionText}`);
}

app.listen(3000, () => console.log("🚀 Server chạy ở http://localhost:3000"));
