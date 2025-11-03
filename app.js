
const cors = require("cors");
const express = require("express");
const cookieParser = require("cookie-parser");
const uploadRouter = require("./routes/upload");
const auth = require('./routes/auth');
const questionsRouter = require("./routes/questions");
const lessons = require("./routes/lessons");
const challenges = require('./routes/challenges');
// const matchingRouter = require('./routes/matching');
const challengeRoutes = require("./routes/challengeRoutes");
const scoreRoutes = require("./routes/scores");
const profileRoutes = require("./routes/profile");

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("./public"));

// ROUTES
app.use("/upload", uploadRouter);
app.use('/auth',auth);
app.use("/api", questionsRouter);
app.use('/api/lessons', lessons);
app.use('/api/challenges', challenges);
app.use("/api/challenges", challengeRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/profile", profileRoutes);

// app.use('/api', matchingRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// const cors = require('cors');
// const express = require('express');
// const uploadRouter = require("./routes/upload");


// const app = express();
// const auth = require('./routes/auth');
// // const user = require('./routes/user');
// // const admin = require('./routes/admin')
// // const products = require('./routes/products');
// // const {isAdmin} = require('./controllers/web_controllers')
// const cookieParser = require("cookie-parser");

// app.use(express.json());
// app.use(cors());
// app.use(express.urlencoded({ extended: false })); 
// app.use(express.static('./public')); 
// app.use(cookieParser());  // Middleware để parse cookie

// // app.use('/user',user);
// // app.use('/admin',admin);
// // app.use('/products',products);
// app.use('/auth',auth);
// app.use("/upload", uploadRouter);
// // app.use(express.static(path.join(__dirname, "public-test1")));

// console.log(__dirname)

// app.listen(3000, () => {
//     console.log('Server is listening on port 3000...');
// });

// process.on('SIGINT', () => {
//     connect.end((err) => {
//         if (err) {
//             console.error("Error closing the connection: " + err.stack);
//         }
//         console.log("Database connection closed.");
//         process.exit(0);
//     });
// });
