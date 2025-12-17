const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection (VERY IMPORTANT FOR RENDER)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mail server error:", error);
  } else {
    console.log("✅ Mail server is ready");
  }
});

// ================= EMAIL FUNCTIONS =================

const sendUserCredentials = async (email, username, password) => {
  try {
    await transporter.sendMail({
      from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Account Details",
      html: `
        <h2>Welcome to Garud Classes</h2>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>Please change your password after login.</p>
      `
    });
  } catch (err) {
    console.error("❌ sendUserCredentials error:", err);
  }
};

const sendStudentCredentials = async (email, username, password) => {
  try {
    await transporter.sendMail({
      from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Student Account Details",
      html: `
        <h2>Welcome to Garud Classes</h2>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>Please change your password after login.</p>
      `
    });
  } catch (err) {
    console.error("❌ sendStudentCredentials error:", err);
  }
};

const sendFormConfirmation = async (email, message) => {
  try {
    await transporter.sendMail({
      from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Application Submitted Successfully",
      html: `<p>${message}</p>`
    });
  } catch (err) {
    console.error("❌ sendFormConfirmation error:", err);
  }
};

const sendStudentTimeTable = async (email, message) => {
  try {
    await transporter.sendMail({
      from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Time Table Updated",
      html: `<p>${message}</p>`
    });
  } catch (err) {
    console.error("❌ sendStudentTimeTable error:", err);
  }
};

const sendAdmitCardUpdate = async (email, message) => {
  try {
    await transporter.sendMail({
      from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Admit Card Updated",
      html: `<p>${message}</p>`
    });
  } catch (err) {
    console.error("❌ sendAdmitCardUpdate error:", err);
  }
};

// EXPORTS
module.exports = {
  sendUserCredentials,
  sendStudentCredentials,
  sendFormConfirmation,
  sendStudentTimeTable,
  sendAdmitCardUpdate
};
