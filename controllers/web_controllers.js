const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const jwt_decode = require('jwt-decode');
const express = require("express");
const cookieParser = require("cookie-parser");
const { db } = require("../config/db");

const saltRounds = 10;
const dirname = path.dirname(path.dirname(__filename));
console.log(dirname)
const JWT_SECRET = process.env.JWT_SECRET;


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public-test1/images/'); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

const signup = (req, res) => {
    const { name, email, password } = req.body;

    bcrypt.hash(password,saltRounds,(err, hash )=>{
        if(err) {
            console.error("Error hash pass:"+err.stack);
            return res.status(500).send("Error processing password.");
        }
        else {
            console.log('hash oke ');
        }

        const sql = "INSERT INTO users(username, email, password) VALUES (?, ?, ?)";

        db.query(sql, [name, email, hash], (err, results) => {
            if (err) {
                console.error("Error inserting data: " + err.stack);
                return res.status(500).send("Error inserting data.");
            }
            console.log("1 record inserted.");
            res.send("User added successfully!");
        });
    });
}

const   login = (req,res) => {
    const { email , password } = req.body;

    const sql="select * from users where email=?"

    db.query(sql, [email], (err, results)=>{
        if(err) {
            console.log('Error fetching data :'+err.stack);
            res.status(500).send("Xảy ra lỗi gì rồi ấy?!")
        }

        if(results.length === 0) {
            return res.status(404).send("Tài khoản này không tồn tại !")
        }

        const users= results[0];
        const storePassHash = users.password;

        bcrypt.compare(password, storePassHash, (err, isMatch) => {
            if (err) {
                console.log("Error comparing password: " + err.stack);
                return res.status(500).send("Lỗi truy vấn mật khẩu");
            }
            if (isMatch) {
                const token = jwt.sign(
                    { 
                        user_id: users.user_id,
                        user_name: users.username,
                        email:users.email,
                        role: users.role
                    },
                    JWT_SECRET,
                    { expiresIn: '2h' }
                );
                console.log('Generated token:',token);
                console.log('Sign in with role :', users.role);
                if(users.role=='admin') {
                    return res.status(200).json({ message: "Đăng nhập thành công với role Admin!", token , URL_directLink:"/admin"});
                }
                else {
                    return res.status(200).json({ message: "Đăng nhập thành công!", token });
                }
            } else {
                return res.status(401).send("Sai mật khẩu òi !");
            }
        })
    })
}

function authenticateToken(req, res, next) {
    const authHeader = req.get('Authorization');
    console.log("Authorization header:", authHeader); 
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        console.log('No token provided or incorrect format'); 
        return res.status(401).send('Access denied: No token provided or incorrect format.');
    } 

    const token = authHeader.split(' ')[1];
    console.log("Token value received:", token);

    jwt.verify(token, JWT_SECRET, (err, user) => {  
        if (err) {
            console.log("Token verification error:", err); 
            return res.status(403).send('Invalid token');
        }
        else{
            console.log("Token verified successfully:", user);
            req.user = user;
        }
        next();
    });
}

const isAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('authHeader của hàm isAdmin:',authHeader);

    if (!authHeader) {
        console.error('Authorization header is missing ,hàm isAdmin1');
        return res.status(401).json({ error: 'Authorization header is missing , hàm isAdmin2' });
    }

    const token = authHeader.split(' ')[1];
    // const token = req.cookies.token;
    console.log('token của cookiess',token);
    if (!token) {
        console.error('Token is missing in Authorization header3');
        return res.status(401).json({ error: 'Token is missing4' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Invalid token:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }

        if (!decoded.role || decoded.role !== 'admin') {
            console.error('Access denied: User is not an admin');
            return res.status(403).json({ error: 'Access denied: You do not have admin privileges' });
        }

        req.admin = decoded; 
        next(); 
    });
};

const admin_hompage = (req, res) => {
    // if (!req.admin || req.admin.role !== 'admin') {
    //     console.log("Không phải admin, không thể truy cập");
    //     return res.status(403).send("You are not administrator!");
    // } else {
    res.sendFile(path.join(dirname,'public-test1','admin.html'))
    
    // }
};

const fetch_admin = (req, res, next) => {
    res.sendFile(path.join(dirname, 'public-test1', 'fetch_admin.html'), (err) => {
        if (err) {
            next(err); // Nếu có lỗi, chuyển đến middleware xử lý lỗi
        } else {
            console.log("File đã được gửi thành công!");
            next(); // Tiếp tục middleware tiếp theo sau khi gửi file xong
        }
    });
};


const getAdminProfile = (req, res) => {
    if (!req.admin || !req.admin.account_id || !req.admin.account_name || !req.admin.role) {
        console.log('Lỗi xác thực');
        return res.status(403).send("User not authenticated properly");
    }
    if(req.admin.role!="admin") {
        return res.status(403).send("You are not administator!");
    }
    res.json({
        message:'Admin profile',
        account_id: req.admin.account_id, account_name: req.admin.account_name, role: req.admin.role
    })
}


const getUserProfile = (req, res) => {
    if (!req.user || !req.user.account_id || !req.user.account_name || !req.user.role) {
        console.log('Lỗi xác thực');
        return res.status(403).send("User not authenticated properly");
    }
    console.log('User authenticated, fetching profile');
    res.json({ message: 'User profile', account_id: req.user.account_id, account_name: req.user.account_name, role: req.user.role });
}

const link_register_and_login = (req, res) => {
    res.sendFile(path.join(dirname,'public-test1','login.html'))
}

module.exports = {
    signup,
    login,
    authenticateToken,
    isAdmin,
    getAdminProfile,
    getUserProfile,
    link_register_and_login
}
