// const { google } = require("googleapis");

// console.log("📩 Gmail API Mailer loaded");

// // OAuth2 client
// const oauth2Client = new google.auth.OAuth2(
//   process.env.GMAIL_CLIENT_ID,
//   process.env.GMAIL_CLIENT_SECRET,
//   "http://localhost"
// );

// oauth2Client.setCredentials({
//   refresh_token:process.env.GMAIL_REFRESH_TOKEN,
// });

// // Gmail API client
// const gmail = google.gmail({
//   version: "v1",
//   auth: oauth2Client,
// });

// /**
//  * Create raw email (base64url encoded)
//  */
// function createRawEmail({ from, to, subject, html, text }) {
//   const lines = [];

//   lines.push(`From: ${from}`);
//   lines.push(`To: ${to}`);
//   lines.push(`Subject: ${subject}`);
//   lines.push("MIME-Version: 1.0");

//   if (html) {
//     lines.push(`Content-Type: text/html; charset="UTF-8"`);
//     lines.push("");
//     lines.push(html);
//   } else {
//     lines.push(`Content-Type: text/plain; charset="UTF-8"`);
//     lines.push("");
//     lines.push(text || "");
//   }

//   const message = lines.join("\n");

//   return Buffer.from(message)
//     .toString("base64")
//     .replace(/\+/g, "-")
//     .replace(/\//g, "_")
//     .replace(/=+$/, "");
// }

// /**
//  * Core send mail function
//  */
// async function sendMail({ to, subject, html, text }) {
//   try {
//     const raw = createRawEmail({
//       from: `Garud Classes <physics.thetestpulse@gmail.com>`,
//       to,
//       subject,
//       html,
//       text,
//     });

//     await gmail.users.messages.send({
//       userId: "me",
//       requestBody: { raw },
//     });

//     console.log(`✅ Mail sent → ${to} | ${subject}`);
//   } catch (err) {
//     console.error("❌ Gmail API mail error:", err.message);
//     throw err;
//   }
// }

// /* =====================================================
//    SPECIFIC MAIL FUNCTIONS (REPLACEMENT FOR OLD ONES)
//    ===================================================== */

// const sendUserCredentials = async (email, username, password) => {
//   return sendMail({
//     to: email,
//     subject: "Your Account Details",
//     html: `
//       <h2>Welcome to Garud Classes</h2>
//       <p><strong>Username:</strong> ${username}</p>
//       <p><strong>Password:</strong> ${password}</p>
//       <p>Please change your password after login.</p>
//     `,
//   });
// };

// const sendStudentCredentials = async (email, username, password) => {
//   return sendMail({
//     to: email,
//     subject: "Student Account Details",
//     html: `
//       <h2>Welcome to Garud Classes</h2>
//       <p><strong>Username:</strong> ${username}</p>
//       <p><strong>Password:</strong> ${password}</p>
//       <p>Please change your password after login.</p>
//     `,
//   });
// };

// const sendFormConfirmation = async (email, message) => {
//   return sendMail({
//     to: email,
//     subject: "Application Submitted Successfully",
//     html: `<p>${message}</p>`,
//   });
// };

// const sendStudentTimeTable = async (email, message) => {
//   return sendMail({
//     to: email,
//     subject: "Time Table Updated",
//     html: `<p>${message}</p>`,
//   });
// };

// const sendAdmitCardUpdate = async (email, message) => {
//   return sendMail({
//     to: email,
//     subject: "Admit Card Updated",
//     html: `<p>${message}</p>`,
//   });
// };


const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Otp = require("../models/Otp");
const crypto = require("crypto");
const Brevo = require('@getbrevo/brevo');

/* ---------------- BREVO SETUP (WORKING) ---------------- */
const brevo = new Brevo.TransactionalEmailsApi();

// ✅ Correct way to set API key
brevo.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const contactApi = new Brevo.ContactsApi();
contactApi.setApiKey(
  Brevo.ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);
const transactionalApi = new Brevo.TransactionalEmailsApi();
// Function to unblock email if blacklisted
async function unblockIfBlacklisted(email) {
  try {
    await transactionalApi.deleteTransacBlockedContacts(email);
    console.log(`✅ Successfully unblocked email: ${email}`);
  } catch (e) {
    // Brevo throws error if email is NOT blocked → ignore safely
    if (e.response?.status === 404) {
      console.log('ℹ️ Email was not blocked');
    } else {
      console.error(
        '❌ Error unblocking email:',
        e.response?.body || e.message
      );
    }
  }
}


/* ---------------- OTP MAIL FUNCTION ---------------- */
async function sendOtpEmail(email, otp) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.templateId = 1; // ✅ transactional template ID
  mail.sender = {
    email: process.env.SENDER_EMAIL,
    name: process.env.SENDER_NAME
  };

  // ✅ pass dynamic values to template
  mail.params = {
    otp: otp
  };

  // ✅ force transactional (no unsubscribe)
  mail.headers = {
    'X-Mailin-transactional': 'true'
  };

  return brevo.sendTransacEmail(mail);
}


async function sendUserCredentials(email, username, password) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.sender = { 
    email: process.env.SENDER_EMAIL, 
    name: process.env.SENDER_NAME 
  };
  mail.subject = "Your New Account Credentials";
  mail.htmlContent = `
    <html>
      <body>
        <h1>Welcome!</h1>
        <p>Your account has been created with the following details:</p>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p>Please log in and change your password immediately.</p>
      </body>
    </html>
  `;

  return brevo.sendTransacEmail(mail);
}

async function sendStudentCredentials(email, username, password) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.sender = { 
    email: process.env.SENDER_EMAIL, 
    name: process.env.SENDER_NAME 
  };
  mail.subject = "Your New Account Credentials";
  mail.htmlContent = `
    <html>
      <body>
        <h1>Welcome!</h1>
        <p>Your account has been created with the following details:</p>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
        </ul>
        <p>Please log in and change your password immediately.</p>
        <a href="https://garudclasseserp.onrender.com/user/reset-passowrd"> Reset Password </a>
      </body>
    </html>
  `;

  return brevo.sendTransacEmail(mail);
}


const sendOtp = async (email, subject,message) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/send-otp",
      {
        email,
        subject,
        message
      }
    );
    console.log("SMTP response:", response.data);
    return response.data;
  } catch (err) {
    console.error("SMTP server error:", err.message);
    return err;
  }
};


const sendAdmitCardUpdate = async (email,message) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/send-otp",
      {
        email,
        subject: "Admit Card Update",
        message
      }
    );
    console.log("SMTP response:", response.data);
    return response.data;
  } catch (err) {
    console.error("SMTP server error:", err.message);
    return err;
  }
};

const sendStudentTimeTable = async (email,message) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/send-otp",
      {
        email,
        subject: "Time Table Update",
        message
      }
    );
    console.log("SMTP response:", response.data);
    return response.data;
  } catch (err) {
    console.error("SMTP server error:", err.message);
    return err;
  }
};

const sendFormConfirmation = async (email,message) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/send-otp",
      {
        email,
        subject: "Application Submitted Successfully",
        message
      }
    );
    console.log("SMTP response:", response.data);
    return response.data;
  } catch (err) {
    console.error("SMTP server error:", err.message);
    return err;
  }
};

// const sendUserCredentials = async (email,username,password) => {
//   try {
//     const message = `<h2>Welcome to Garud Classes</h2>
//       <p><strong>Username:</strong> ${username}</p>
//       <p><strong>Password:</strong> ${password}</p>
//       <p>Please change your password after login.</p>
//     `;
//     const response = await axios.post(
//       "http://localhost:3000/send-otp",
//       {
//         email,
//         subject: "Application Submitted Successfully",
//         message
//       }
//     );
//     console.log("SMTP response:", response.data);
//     return response.data;
//   } catch (err) {
//     console.error("SMTP server error:", err.message);
//     return err;
//   }
// };

// const sendStudentCredentials = async (email,username,password) => {
//   try {
//     const message = `<h2>Welcome to Garud Classes</h2>
//       <p><strong>Username:</strong> ${username}</p>
//       <p><strong>Password:</strong> ${password}</p>
//       <p>Please change your password after login.</p>
//     `;
//     const response = await axios.post(
//       "http://localhost:3000/send-otp",
//       {
//         email,
//         subject: "Application Submitted Successfully",
//         message
//       }
//     );
//     console.log("SMTP response:", response.data);
//     return response.data;
//   } catch (err) {
//     console.error("SMTP server error:", err.message);
//     return err;
//   }
// };

const axios = require("axios");


// EXPORTS
module.exports = {
  sendUserCredentials,
  sendStudentCredentials,
  sendFormConfirmation,
  sendStudentTimeTable,
  sendAdmitCardUpdate,
  sendOtp
};
