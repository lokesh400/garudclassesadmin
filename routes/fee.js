const express = require("express");
const Fee = require("../models/Fee");
const User = require("../models/User");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { isLoggedIn, requireRole } = require("../middleware/auth");
const router = express.Router();


router.get("/", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const fees = await Fee.find()
    .populate({ path: "student", populate: { path: "batch" } });
  res.render("fees/list", { fees,
    title: "Fees",
    pageTitle: "Fees",
    activePage: "fees",
   });
});

/* EXPORT STUDENT FEES EXCEL */
router.get("/export/excel", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  try {
    const fees = await Fee.find().populate({ path: "student", populate: { path: "batch" } });

    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet("Student Fee Summary");

    summarySheet.columns = [
      { header: "Student Name", key: "studentName", width: 30 },
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Batch", key: "batchName", width: 22 },
      { header: "Admission Fee", key: "admissionFee", width: 15 },
      { header: "Tuition Fee", key: "tuitionFee", width: 15 },
      { header: "Transport Fee", key: "transportFee", width: 15 },
      { header: "Other Fee", key: "otherFee", width: 12 },
      { header: "Total Fee", key: "totalFee", width: 12 },
      { header: "Total Paid", key: "totalPaid", width: 12 },
      { header: "Balance", key: "balance", width: 12 },
    ];

    summarySheet.getRow(1).font = { bold: true };

    let aggregateTotalFee = 0;
    let aggregateTotalPaid = 0;
    let aggregateBalance = 0;

    fees.forEach((fee) => {
      const totalPaid = (fee.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalFee = Number(fee.totalFee || 0);
      const balance = totalFee - totalPaid;

      aggregateTotalFee += totalFee;
      aggregateTotalPaid += totalPaid;
      aggregateBalance += balance;

      summarySheet.addRow({
        studentName: fee.student?.name || "Unknown",
        rollNumber: fee.student?.rollNumber || "-",
        batchName: fee.student?.batch?.name || "Unassigned",
        admissionFee: fee.admissionFee || 0,
        tuitionFee: fee.tuitionFee || 0,
        transportFee: fee.transportFee || 0,
        otherFee: fee.otherFee || 0,
        totalFee,
        totalPaid,
        balance,
      });
    });

    const totalRow = summarySheet.addRow({
      studentName: "GRAND TOTAL",
      totalFee: aggregateTotalFee,
      totalPaid: aggregateTotalPaid,
      balance: aggregateBalance,
    });

    totalRow.font = { bold: true };
    summarySheet.getCell(`A${totalRow.number}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };

    summarySheet.getCell(`I${totalRow.number}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCFCE7" },
    };
    summarySheet.getCell(`I${totalRow.number}`).font = {
      bold: true,
      color: { argb: "FF166534" },
    };

    summarySheet.getCell(`J${totalRow.number}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEE2E2" },
    };
    summarySheet.getCell(`J${totalRow.number}`).font = {
      bold: true,
      color: { argb: "FFB91C1C" },
    };

    const paymentsSheet = workbook.addWorksheet("Payments");
    paymentsSheet.columns = [
      { header: "Student Name", key: "studentName", width: 30 },
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Batch", key: "batchName", width: 22 },
      { header: "Amount", key: "amount", width: 12 },
      { header: "Mode", key: "mode", width: 12 },
      { header: "Receipt No", key: "receiptNo", width: 18 },
      { header: "Payment Date", key: "paymentDate", width: 24 },
    ];
    paymentsSheet.getRow(1).font = { bold: true };

    fees.forEach((fee) => {
      (fee.payments || []).forEach((payment) => {
        paymentsSheet.addRow({
          studentName: fee.student?.name || "Unknown",
          rollNumber: fee.student?.rollNumber || "-",
          batchName: fee.student?.batch?.name || "Unassigned",
          amount: payment.amount || 0,
          mode: payment.mode || "-",
          receiptNo: payment.receiptNo || "-",
          paymentDate: payment.date ? new Date(payment.date).toLocaleString("en-IN") : "-",
        });
      });
    });

    const fileDate = new Date().toISOString().slice(0, 10);
    const fileName = `student-fee-report-${fileDate}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("EXPORT EXCEL ERROR:", error);
    return res.status(500).send("Unable to export fee report");
  }
});

/* DATE-WISE FEE TABLE */
router.get("/date-wise", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const selectedDate = (req.query.date || "").trim();
  const preset = (req.query.preset || "").trim();
  const rows = [];
  let hasFilter = false;
  let filterLabel = "";

  const getDayRange = (dateObj) => {
    const start = new Date(dateObj);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  };

  let start = null;
  let end = null;

  if (preset === "today") {
    const range = getDayRange(new Date());
    start = range.start;
    end = range.end;
    hasFilter = true;
    filterLabel = "Today";
  } else if (preset === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const range = getDayRange(d);
    start = range.start;
    end = range.end;
    hasFilter = true;
    filterLabel = "Yesterday";
  } else if (preset === "this-month") {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    hasFilter = true;
    filterLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } else if (selectedDate) {
    const parsed = new Date(selectedDate);
    if (!Number.isNaN(parsed.getTime())) {
      const range = getDayRange(parsed);
      start = range.start;
      end = range.end;
      hasFilter = true;
      filterLabel = selectedDate;
    }
  }

  if (hasFilter && start && end) {
    const fees = await Fee.find({
      "payments.date": { $gte: start, $lt: end },
    }).populate({ path: "student", populate: { path: "batch" } });

    fees.forEach((fee) => {
      fee.payments.forEach((payment) => {
        if (payment.date >= start && payment.date < end) {
          rows.push({
            studentId: fee.student?._id,
            studentName: fee.student?.name || "Unknown",
            rollNumber: fee.student?.rollNumber || "-",
            batchName: fee.student?.batch?.name || "Unassigned",
            amount: payment.amount || 0,
            mode: payment.mode || "-",
            receiptNo: payment.receiptNo || "-",
            paymentDate: payment.date,
            feeId: fee._id,
            paymentId: payment._id,
          });
        }
      });
    });

    rows.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }

  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  res.render("fees/date-wise", {
    selectedDate,
    preset,
    hasFilter,
    filterLabel,
    rows,
    totalAmount,
    title: "Date-wise Fee Table",
    pageTitle: "Date-wise Fee Table",
    activePage: "fees",
  });
});

/* ADD FEE - FORM */
router.get("/new", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const activeStudents = await User.find({ role: "student", isActive: true })
    .populate("batch")
    .sort({ name: 1 });

  const fees = await Fee.find({}, "student admissionFee tuitionFee transportFee otherFee");
  const studentFeeMap = new Set(fees.map((f) => String(f.student)));
  const feeByStudent = {};
  fees.forEach((fee) => {
    feeByStudent[String(fee.student)] = {
      admissionFee: fee.admissionFee || 0,
      tuitionFee: fee.tuitionFee || 0,
      transportFee: fee.transportFee || 0,
      otherFee: fee.otherFee || 0,
    };
  });

  res.render("fees/new", {
    students: activeStudents,
    studentFeeMap,
    feeByStudent,
    title: "Add Fee",
    pageTitle: "Add Fee",
    activePage: "fees",
  });
});

/* ADD/UPDATE FEE */
router.post("/new", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  try {
    const { studentId } = req.body;
    const admissionFee = Number(req.body.admissionFee || 0);
    const tuitionFee = Number(req.body.tuitionFee || 0);
    const transportFee = Number(req.body.transportFee || 0);
    const otherFee = Number(req.body.otherFee || 0);

    if (!studentId) {
      return res.status(400).send("Student is required");
    }

    const student = await User.findOne({ _id: studentId, role: "student", isActive: true });
    if (!student) {
      return res.status(404).send("Active student not found");
    }

    let fee = await Fee.findOne({ student: studentId });

    if (!fee) {
      fee = new Fee({
        student: studentId,
        admissionFee,
        tuitionFee,
        transportFee,
        otherFee,
      });
    } else {
      fee.admissionFee = admissionFee;
      fee.tuitionFee = tuitionFee;
      fee.transportFee = transportFee;
      fee.otherFee = otherFee;
    }

    await fee.save();
    return res.redirect(`/fees/student/${studentId}`);
  } catch (error) {
    console.error("ADD/UPDATE FEE ERROR:", error);
    return res.status(500).send("Unable to save fee details");
  }
});

/* STUDENT HISTORY */
router.get("/student/:studentId", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const fee = await Fee.findOne({ student: req.params.studentId })
    .populate("student");
  const paid = fee.payments.reduce((s, p) => s + p.amount, 0);
  res.render("fees/student-history", {
    fee,
    paid,
    balance: fee.totalFee - paid,
    title: "Fee History",
    pageTitle: "Fee History",
    activePage: "fees",
  });
});

/* ADD PAYMENT */
router.post("/student/:studentId/pay", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  console.log(req.body,req.params.studentId);
  const fee = await Fee.findOne({ student: req.params.studentId });
  fee.payments.push({
    amount: req.body.amount,
    mode: req.body.mode,
    // receiptNo: "RCPT-" + Date.now()
  });
  await fee.save();
  res.redirect(`/fees/student/${req.params.studentId}`);
});

/* EDIT PAYMENT */
router.post("/payment/:feeId/:paymentId/edit", isLoggedIn, requireRole("superadmin"), async (req, res) => {
  const fee = await Fee.findById(req.params.feeId);
  const p = fee.payments.id(req.params.paymentId);
  p.amount = req.body.amount;
  p.mode = req.body.mode;
  await fee.save();
  res.redirect(`/fees/student/${req.params.studentId}`);
});

/* DELETE PAYMENT */
// router.post("/payment/:feeId/:paymentId/delete", async (req, res) => {
//   const fee = await Fee.findById(req.params.feeId);
//   fee.payments.id(req.params.paymentId).remove();
//   await fee.save();
//   res.redirect(`/fees/student/${req.params.studentId}`);
// });

/* PDF RECEIPT */
router.get("/receipt/:feeId/:paymentId", async (req, res) => {
  const fee = await Fee.findById(req.params.feeId).populate("student");
  const p = fee.payments.id(req.params.paymentId);

  const doc = new PDFDocument();
  res.setHeader("Content-Type", "application/pdf");
  doc.pipe(res);

  doc.fontSize(18).text("Fee Receipt", { align: "center" });
  doc.moveDown();
  doc.text(`Student: ${fee.student.name}`);
  doc.text(`Receipt: ${p.receiptNo}`);
  doc.text(`Amount: ₹${p.amount}`);
  doc.text(`Mode: ${p.mode}`);
  doc.text(`Date: ${p.date.toDateString()}`);
  doc.end();
});

module.exports = router;
