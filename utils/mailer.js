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

const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').trim();

/* ---------------- BREVO SETUP (WORKING) ---------------- */
const brevo = new Brevo.TransactionalEmailsApi();

// ✅ Correct way to set API key
brevo.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  BREVO_API_KEY
);

const contactApi = new Brevo.ContactsApi();
contactApi.setApiKey(
  Brevo.ContactsApiApiKeys.apiKey,
  BREVO_API_KEY
);
const transactionalApi = new Brevo.TransactionalEmailsApi();
transactionalApi.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  BREVO_API_KEY
);
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
        <a href="https://garudclasseserp.onrender.com/user/reset-password"> Reset Password </a>
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

async function sendStudentResultsEmail(email, studentName, testTitle, examType, scores, stats) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.sender = { 
    email: process.env.SENDER_EMAIL, 
    name: process.env.SENDER_NAME 
  };
  mail.subject = `🔔 Test Results Released: ${testTitle}`;

  let scoreDetailsHtml = '';
  if (examType === 'JEE') {
    scoreDetailsHtml = `
      <li style="margin-bottom: 8px;"><strong>Physics:</strong> ${scores.physics} / ${scores.physicsTotal}</li>
      <li style="margin-bottom: 8px;"><strong>Chemistry:</strong> ${scores.chemistry} / ${scores.chemistryTotal}</li>
      <li style="margin-bottom: 8px;"><strong>Maths:</strong> ${scores.math} / ${scores.mathTotal}</li>
    `;
  } else {
    scoreDetailsHtml = `
      <li style="margin-bottom: 8px;"><strong>Physics:</strong> ${scores.physics} / ${scores.physicsTotal}</li>
      <li style="margin-bottom: 8px;"><strong>Chemistry:</strong> ${scores.chemistry} / ${scores.chemistryTotal}</li>
      <li style="margin-bottom: 8px;"><strong>Botany:</strong> ${scores.botany} / ${scores.botanyTotal}</li>
      <li style="margin-bottom: 8px;"><strong>Zoology:</strong> ${scores.zoology} / ${scores.zoologyTotal}</li>
    `;
  }

  mail.htmlContent = `
    <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          <h2 style="color: #4f46e5; text-align: center; font-size: 24px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #e0e7ff; padding-bottom: 15px;">📊 Test Performance Report</h2>
          
          <p style="font-size: 16px;">Dear <strong>${studentName}</strong>,</p>
          <p style="font-size: 16px; color: #4b5563;">Your results for the test <strong style="color: #111827;">"${testTitle}"</strong> (${examType}) are detailed below:</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #f3f4f6; margin: 20px 0;">
            <h3 style="color: #1e3a8a; margin-top: 0; font-size: 18px; margin-bottom: 12px;">Subject-wise Score:</h3>
            <ul style="font-size: 16px; list-style-type: none; padding-left: 0; margin-bottom: 0;">
              ${scoreDetailsHtml}
              <li style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px; font-weight: 700; color: #4f46e5; font-size: 18px;">
                Total Score: ${scores.total} / ${scores.maxTotal}
              </li>
            </ul>
          </div>

          <h3 style="color: #1e3a8a; font-size: 18px; margin-top: 28px; margin-bottom: 12px;">Batch Stats Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: left;">
                <th style="padding: 12px 16px; font-weight: 600; font-size: 14px; border: 1px solid #e5e7eb;">Metric</th>
                <th style="padding: 12px 16px; font-weight: 600; font-size: 14px; border: 1px solid #e5e7eb;">Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-size: 15px;">Batch Highest Score</td>
                <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-weight: 700; color: #16a34a; font-size: 15px;">${stats.highest}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-size: 15px;">Batch Average Score</td>
                <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-weight: 700; color: #3b82f6; font-size: 15px;">${stats.average}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-size: 15px;">Batch Lowest Score</td>
                <td style="padding: 12px 16px; border: 1px solid #e5e7eb; font-weight: 700; color: #ef4444; font-size: 15px;">${stats.lowest}</td>
              </tr>
            </tbody>
          </table>

          <p style="margin-top: 30px; text-align: center; font-size: 15px; color: #6b7280;">
            Log in to the <a href="https://garudclasseserp.onrender.com" style="color: #4f46e5; text-decoration: underline; font-weight: 500;">Garud Classes ERP</a> to view detailed analytics.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">
            This is an automated result notification from Garud Classes. Please do not reply directly to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  return brevo.sendTransacEmail(mail);
}

async function sendDeleteOtpEmail(email, studentName, otp) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.sender = { 
    email: process.env.SENDER_EMAIL, 
    name: process.env.SENDER_NAME 
  };
  mail.subject = "⚠️ Security Authorization Required: Student Deletion Request";
  mail.htmlContent = `
    <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          <h2 style="color: #ef4444; text-align: center; font-size: 22px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #fee2e2; padding-bottom: 15px;">⚠️ Deletion Authorization Required</h2>
          
          <p style="font-size: 16px;">Hello,</p>
          <p style="font-size: 16px; color: #4b5563;">You have requested to permanently delete the student: <strong style="color: #111827;">${studentName}</strong>.</p>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; border: 1px solid #fecaca; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #991b1b; margin-top: 0; font-weight: 600;">YOUR ONE-TIME PASSWORD (OTP)</p>
            <h1 style="font-size: 36px; letter-spacing: 6px; color: #b91c1c; margin: 10px 0; font-weight: 800;">${otp}</h1>
            <p style="font-size: 12px; color: #991b1b; margin-bottom: 0;">This OTP is valid for 5 minutes and can only be used once.</p>
          </div>

          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            If you did not request this action, please secure your account immediately.
          </p>
        </div>
      </body>
    </html>
  `;

  return brevo.sendTransacEmail(mail);
}

async function sendStaffCredentialsEmail(email, name, username, password, loginLink) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.sender = { 
    email: process.env.SENDER_EMAIL, 
    name: process.env.SENDER_NAME 
  };
  mail.subject = "Welcome to Garud Classes - Your Staff Account Credentials";
  mail.htmlContent = `
    <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          <h2 style="color: #4f46e5; text-align: center; font-size: 22px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #e0e7ff; padding-bottom: 15px;">Welcome to Garud Classes!</h2>
          
          <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #4b5563;">An account has been successfully created for you as a staff member of Garud Classes. Here are your portal login credentials:</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #f3f4f6; margin: 20px 0;">
            <p style="font-size: 15px; margin: 8px 0;"><strong>Username / Email:</strong> ${username}</p>
            <p style="font-size: 15px; margin: 8px 0;"><strong>Password:</strong> ${password}</p>
          </div>
 
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Log In to Portal</a>
          </div>
 
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Please log in and submit your required documents as soon as possible.
          </p>
        </div>
      </body>
    </html>
  `;
 
  return brevo.sendTransacEmail(mail);
}

async function sendOfferLetterEmail(email, name, designation, salary, joiningDate, offerLink) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.sender = { 
    email: process.env.SENDER_EMAIL, 
    name: process.env.SENDER_NAME 
  };
  mail.subject = "Offer Letter from Garud Classes";
  mail.htmlContent = `
    <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          <h2 style="color: #4f46e5; text-align: center; font-size: 22px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #e0e7ff; padding-bottom: 15px;">Employment Offer Letter</h2>
          
          <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #4b5563;">We are pleased to offer you employment at Garud Classes. Here are the key details of your offer:</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #f3f4f6; margin: 20px 0;">
            <p style="font-size: 15px; margin: 8px 0;"><strong>Designation:</strong> ${designation}</p>
            <p style="font-size: 15px; margin: 8px 0;"><strong>Salary / Compensation:</strong> ${salary}</p>
            <p style="font-size: 15px; margin: 8px 0;"><strong>Joining Date:</strong> ${new Date(joiningDate).toLocaleDateString('en-IN')}</p>
          </div>
 
          <p style="font-size: 16px; color: #4b5563;">Please review, sign, and accept this offer letter by clicking the link below:</p>
 
          <div style="text-align: center; margin: 30px 0;">
            <a href="${offerLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">View & Sign Offer Letter</a>
          </div>
 
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            This offer is contingent upon successful verification of your digital signature and documents.
          </p>
        </div>
      </body>
    </html>
  `;
 
  return brevo.sendTransacEmail(mail);
}

async function sendForceHireOtpEmail(email, candidateName, otp) {
  const mail = new Brevo.SendSmtpEmail();
  mail.to = [{ email }];
  mail.sender = { 
    email: process.env.SENDER_EMAIL, 
    name: process.env.SENDER_NAME 
  };
  mail.subject = "⚠️ Security Authorization Required: Force Hire Candidate Request";
  mail.htmlContent = `
    <html>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; line-height: 1.6; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          <h2 style="color: #ef4444; text-align: center; font-size: 22px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #fee2e2; padding-bottom: 15px;">⚠️ Force Hire Authorization Required</h2>
          
          <p style="font-size: 16px;">Hello,</p>
          <p style="font-size: 16px; color: #4b5563;">You have requested to force hire the candidate: <strong style="color: #111827;">${candidateName}</strong> without offer letter acceptance.</p>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 12px; border: 1px solid #fecaca; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #991b1b; margin-top: 0; font-weight: 600;">YOUR ONE-TIME PASSWORD (OTP)</p>
            <h1 style="font-size: 36px; letter-spacing: 6px; color: #b91c1c; margin: 10px 0; font-weight: 800;">${otp}</h1>
            <p style="font-size: 12px; color: #991b1b; margin-bottom: 0;">This OTP is valid for 5 minutes and can only be used once.</p>
          </div>
 
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            If you did not request this action, please secure your account immediately.
          </p>
        </div>
      </body>
    </html>
  `;
 
  return brevo.sendTransacEmail(mail);
}
 
const axios = require("axios");
 
 
// EXPORTS
module.exports = {
  sendUserCredentials,
  sendStudentCredentials,
  sendFormConfirmation,
  sendStudentTimeTable,
  sendAdmitCardUpdate,
  sendOtp,
  sendStudentResultsEmail,
  sendDeleteOtpEmail,
  sendStaffCredentialsEmail,
  sendOfferLetterEmail,
  sendForceHireOtpEmail
};
