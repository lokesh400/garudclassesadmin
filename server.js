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

/* ---------------- CORE ---------------- */
const connectDB = require("./config/db");
const User = require("./models/User");
const Batch = require("./models/Batch");
const { isLoggedIn, requireRole } = require("./middleware/auth");

/* ---------------- ROUTES ---------------- */
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
const dataRoutes = require("./routes/data");
const userEditRoutes = require("./routes/userEdit");
const resetPasswordRoute = require("./routes/password");

const recruitmentsRoutes = require("./routes/recruitments");
const recruitmentPublicRoutes = require("./routes/recruitmentPublic");
const staffRoutes = require("./routes/staff");

const mobileAuthRoutes = require("./routes/mobile/auth");
const mobileFeeRoutes = require("./routes/mobile/fee");
const mobileTimetableRoutes = require("./routes/mobile/timetable");
const mobileMarksRoutes = require("./routes/mobile/marks");
const mobileAdminBatchRoutes = require("./routes/mobile/admin/batch");
const mobileAdminQueryRoutes = require("./routes/mobile/admin/query");
const mobileAdminFormRoutes = require("./routes/mobile/admin/form");
const mobileAdminFeeRoutes = require("./routes/mobile/admin/fee");
const studioBookingRoutes = require("./routes/mobile/studioBooking");

/* ---------------- APP INIT ---------------- */
const app = express();
const server = http.createServer(app);
// Kept for future socket integrations.
const io = new Server(server);
void io;

const PORT = process.env.PORT || 5000;

/* ---------------- BASIC MIDDLEWARE ---------------- */
app.use(
  cors({
    origin: 8081,
    credentials: true,
    "https://garudattendance.onrender.com": true,
    "https://garudclasses.com": true,
    // "http://localhost:3000": true,
    "http://localhost:8081": true,
    // "http://localhost:5000": true,
    // "http://localhost:8000": true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ---------------- VIEW ENGINE ---------------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/admin");

/* ---------------- SESSION ---------------- */
app.use(
  session({
    secret: "njjhjhjhjghjghjgh",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 60 * 60 * 24 * 7, // 7 days
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
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

/* ---------------- API ROUTES ---------------- */
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
app.use("/", dataRoutes);
app.use("/", userEditRoutes);
app.use(resetPasswordRoute);

/* ---------------- MOBILE ROUTES ---------------- */
app.use("/auth", mobileAuthRoutes);
app.use("/api/fees", mobileFeeRoutes);
app.use("/api/timetable", mobileTimetableRoutes);
app.use("/api/marks", mobileMarksRoutes);

app.use("/api/batch/admin", mobileAdminBatchRoutes);
app.use("/api/query/admin", mobileAdminQueryRoutes);
app.use("/api/form/admin", mobileAdminFormRoutes);
app.use("/api/fee/admin", mobileAdminFeeRoutes);

app.use("/api/studio-bookings", studioBookingRoutes);

/* ---------------- PAGES ---------------- */
app.get("/", (req, res) => res.redirect("/admin"));

app.get("/data-deletion-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "data-deletion-policy.html"));
});

app.get("/admin", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const users = await User.find({ role: "student" });
  const batch = await Batch.find();
  res.render("admin", {
    title: "Dashboard",
    pageTitle: "Dashboard",
    activePage: "dashboard",
    students: users.length,
    batches: batch.length,
  });
});

app.get("/admin/staff-management", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  res.render("admin/staffIndex", {
    title: "Staff Management",
    pageTitle: "Staff Management",
    activePage: "staffManagement",
  });
});

app.use("/admin/recruitments", recruitmentsRoutes);
app.use("/recruitments", recruitmentPublicRoutes);
app.use("/admin/staff", staffRoutes);


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

app.get("/attendance/get/students/all", async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).populate("batch");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

app.get("/api/attendance", async (req, res) => {
  try {
    console.log(req.query);
    const { month, year } = req.query;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!month || !year) {
      return res.status(400).json({ message: "month and year are required" });
    }

    const userid = req.user.id;
    const response = await axios.get(
      `https://garudattendance.onrender.com/attendance/student/${userid}/${month}/${year}`
    );
    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", err });
  }
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* ---------------- ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

/* ---------------- SERVER START ---------------- */
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
  }, 10000);
}

async function startServer() {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    startKeepAlive();
  });
}

startServer();