const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const { db } = require("../config/db");
const { verifyToken } = require("../middlewares/auth");

// === Multer cấu hình upload avatar ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/avatars/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.user.user_id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // giới hạn 3MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error("Định dạng ảnh không hợp lệ!"));
  },
});

// === 1. Lấy thông tin hồ sơ người dùng ===
router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT username, full_name, email, role FROM users WHERE user_id = ?",
      [req.user.user_id]
    );
    if (!rows.length) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// === 2. Cập nhật tên hiển thị ===
router.put("/name", verifyToken, async (req, res) => {
  const { username } = req.body;
  if (!username ) return res.status(400).json({ message: "Thiếu tên mới" });

  try {
    await db.query("UPDATE users SET username = ? WHERE user_id = ?", [username, req.user.user_id]);
    res.json({ message: "Đổi tên thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// === 3. Cập nhật avatar ===
router.put("/avatar", verifyToken, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Không có file được tải lên" });

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    await db.query("UPDATE users SET avatar_url = ? WHERE user_id = ?", [avatarPath, req.user.user_id]);
    res.json({ message: "Cập nhật avatar thành công", avatar_url: avatarPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// === 4. Đổi mật khẩu ===
router.put("/password", verifyToken, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password)
    return res.status(400).json({ message: "Thiếu thông tin mật khẩu" });

  try {
    const [rows] = await db.query("SELECT password FROM users WHERE user_id = ?", [req.user.user_id]);
    if (!rows.length) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    const isMatch = await bcrypt.compare(old_password, rows[0].password);
    if (!isMatch) return res.status(401).json({ message: "Mật khẩu cũ không đúng" });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query("UPDATE users SET password = ? WHERE user_id = ?", [hash, req.user.user_id]);
    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
