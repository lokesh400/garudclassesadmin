require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const flash = require("connect-flash");
const axios = require("axios");
const QRCode = require("qrcode");

const connectDB = require("./config/db");
const User = require("./models/User");

// const {
//   client,
//   initSocket,
//   waStatus,
// } = require("./whatsapp/whatsappClient");

// Routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const attendanceRoutes = require("./routes/attendance");
const timetableRoutes = require("./routes/timetable");
const formRouter = require("./routes/form");
const admitcardRouter = require("./routes/admitCard");
const marksRouter = require("./routes/testmarks");
const batchRoutes = require("./routes/batch");
const feeRouter = require("./routes/fee");
const webAuthRoutes = require("./routes/webauthroutes");
const queryRoutes = require("./routes/query");

const mobileAuthRoutes = require("./routes/mobile/auth");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 5000;

/* ---------------- BASIC MIDDLEWARE ---------------- */
// app.use(cors());
app.use(
  cors({
    origin: 8081,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- VIEW ENGINE ---------------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/admin");

/* ---------------- SESSION (MUST COME FIRST) ---------------- */
app.use(
  session({
    secret: "njjhjhjhjghjghjgh",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 60 * 60 * 24 * 7 // 7 days
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

/* ---------------- PASSPORT ---------------- */
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());

app.use((req, res, next) => {
  res.locals.currUser = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});


/* ---------------- SOCKET.IO ---------------- */
// initSocket(io);

/* ---------------- ROUTES ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/batches", batchRoutes);
app.use("/fees", feeRouter);
app.use("/forms", formRouter);
app.use("/admitcard", admitcardRouter);
app.use("/marks", marksRouter);
app.use("/", webAuthRoutes);
app.use("/", queryRoutes);
const resetPasswordRoute = require("./routes/password");
app.use(resetPasswordRoute);


app.use("/auth", mobileAuthRoutes);

const { isLoggedIn, requireRole } = require("./middleware/auth");

/* ---------------- PAGES ---------------- */
app.get("/", (req, res) => res.redirect("/admin"));

app.get("/admin", isLoggedIn, requireRole("superadmin"), (req, res) => {
  res.render("admin", {
    title: "Dashboard",
    pageTitle: "Dashboard",
    activePage: "dashboard",
  });
});

// app.get("/whatsapp", isLoggedIn, requireRole("superadmin"), async (req, res) => {
//   const response = await axios.get("http://localhost:3000/whatsapp");
//       console.log(response.data);
//       const qrImage = await QRCode.toDataURL(response.data.status.qr);
//       res.render("whatsapp/index", {
//       status: response.data.status,
//       qrImage,
//       title: "WhatsApp",
//       pageTitle: "WhatsApp",
//       activePage: "whatsapp",
//     });
//    });

// app.get("/send",isLoggedIn,requireRole("superadmin"), async (req, res) => {
//   const users = await User.find({role:"student"}).populate("batch");
//   console.log(users);
//   res.render("whatsapp/message", {
//     users,
//     status: waStatus,
//     title: "WhatsApp",
//     pageTitle: "WhatsApp",
//     activePage: "whatsapp",
//   });
// });

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

function startKeepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!url) {
    console.warn("⚠️ RENDER_EXTERNAL_URL not set, keep-alive disabled");
    return;
  }
  const isHttps = url.startsWith("https");
  const client = isHttps ? https : http;
  const pingUrl = `${url}/health`;
  setInterval(() => {
    const req = client.get(pingUrl, (res) => {
      console.log(`🔄 Keep-alive ping → ${res.statusCode}`);
      res.resume();
    });
    req.on("error", (err) => {
      console.error("❌ Keep-alive error:", err.message);
    });
    req.setTimeout(5000, () => {
      console.warn("⏱️ Keep-alive timeout");
      req.destroy();
    });
  }, 1000 * 60 * 1);
}

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    startKeepAlive();
  });
};

const feeRoutes = require("./routes/mobile/fee");
app.use("/api/fees", feeRoutes);
const timetable = require("./routes/mobile/timetable");
app.use("/api/timetable", timetable)
const marks = require("./routes/mobile/marks");
app.use("/api/marks", marks);
app.post("/me/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).populate("batch");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// app.get("/mail", async (req, res) => {
//   const { sendUserCredentials } = require("./utils/mailer"); 
//   try {
//     await sendUserCredentials("lokeshbadgujjar400@gmail.com", "lokesh", "lokesh123");
//     res.send("Email sent");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error sending email");
//   }
// });

startServer();