require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const expressLayouts = require("express-ejs-layouts");

const connectDB = require("./config/db");

// WhatsApp module
const {
  client,
  initSocket,
  waStatus,
} = require("./whatsapp/whatsappClient");

// Routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const materialRoutes = require("./routes/materials");
const attendanceRoutes = require("./routes/attendance");
const timetableRoutes = require("./routes/timetable");
const formRouter = require("./routes/form");
const admitcardRouter = require("./routes/admitCard");
const marksRouter = require("./routes/testmarks");
const batchRoutes = require("./routes/batch");
const feeRouter = require("./routes/fee");
const { title } = require("process");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 5000;

/* ---------------- Middleware ---------------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

/* ---------------- View Engine ---------------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/admin");

/* ---------------- Init WhatsApp Socket ---------------- */
initSocket(io);

/* ---------------- Admin Dashboard ---------------- */
app.get("/admin", (req, res) => {
  res.render("admin", {
    title: "Dashboard",
    pageTitle: "Dashboard",
    activePage: "dashboard",
  });
});

/* ---------------- WhatsApp UI ---------------- */
app.get("/whatsapp", (req, res) => {
  res.render("whatsapp/index.ejs", { status: waStatus,
    title: "WhatsApp",
    pageTitle: "WhatsApp",
    activePage: "whatsapp",
   });
});

app.get("/send", (req, res) => {
  res.render("whatsapp/message.ejs", { status: waStatus,
    title: "WhatsApp",
    pageTitle: "WhatsApp",
    activePage: "whatsapp",
   });
});

/* ---------------- Send WhatsApp Message ---------------- */
app.post("/send", async (req, res) => {
    try {
        const rawNumber = req.body.number;
        const message = req.body.msg || "Hello from bot";
        const number = rawNumber.startsWith("91")
            ? rawNumber
            : "91" + rawNumber;
        const waId = await client.getNumberId(number+ "@c.us");
        if (!waId) {
            return res.json({ ok: false, error: "Number not on WhatsApp" });
        }
        await client.sendMessage(number + "@c.us", message);
        res.json({ ok: true });
    } catch (error) {
        console.log(error);
        res.json({ ok: false, error: error.message });
    }
});

// const express = require("express");
// const router = express.Router();
const Marks = require("./models/Marks");
const User = require("./models/User");
// const client = require("../whatsappClient");

// Delay helper
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
app.post("/send/results/:batchId/:testTitle", async (req, res) => {
  try {
    const results = await Marks.find({ batch: req.params.batchId, testTitle: req.params.testTitle }).populate("student").select(" -_id -batch -username -uploadedAt -__v");
    if (!results.length) return res.status(404).json({ message: "No results found for this batch" });
    (async () => {
      for (const result of results) {
        const user = await User.findOne({ rollNumber: result.rollNo });
        if (user) {
          const phoneNumber = user.number;
          const chatId = `91${phoneNumber}@c.us`;
          if (client && client.info && client.info.wid) {
            const messageText = `Hello ${result.student}, your ${result.testTitle} results for ${result.examType} are:${result}`;
            await client.sendMessage(chatId, messageText);
            await delay(20000); // 20 seconds interval
          }
        }
      }
    })();
    res.json({ message: "WhatsApp sending started in the background!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending results", error: err.message });
  }
});

/* ---------------- API Routes ---------------- */
app.use("/api/batches", batchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/forms", formRouter);
app.use("/admitcard", admitcardRouter);
app.use("/marks", marksRouter);
app.use("/fees", feeRouter);

/* ---------------- Error Handler ---------------- */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

/* ---------------- Start Server ---------------- */
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT}`)
  );
};


startServer();
