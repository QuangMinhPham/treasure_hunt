const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET ;

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Thiếu token xác thực" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT verify error:", err);
      return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
    }

    req.user = decoded; // 🔥 chứa user_id, user_name, role
    next();
  });
}

module.exports = { verifyToken };
