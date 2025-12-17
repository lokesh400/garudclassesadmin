const { google } = require("googleapis");

console.log("📩 Gmail API Mailer loaded");

// OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "http://localhost"
);

oauth2Client.setCredentials({
  refresh_token:process.env.GMAIL_REFRESH_TOKEN,
});

// Gmail API client
const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

/**
 * Create raw email (base64url encoded)
 */
function createRawEmail({ from, to, subject, html, text }) {
  const lines = [];

  lines.push(`From: ${from}`);
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${subject}`);
  lines.push("MIME-Version: 1.0");

  if (html) {
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
    lines.push("");
    lines.push(html);
  } else {
    lines.push(`Content-Type: text/plain; charset="UTF-8"`);
    lines.push("");
    lines.push(text || "");
  }

  const message = lines.join("\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Core send mail function
 */
async function sendMail({ to, subject, html, text }) {
  try {
    const raw = createRawEmail({
      from: `Garud Classes <physics.thetestpulse@gmail.com>`,
      to,
      subject,
      html,
      text,
    });

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log(`✅ Mail sent → ${to} | ${subject}`);
  } catch (err) {
    console.error("❌ Gmail API mail error:", err.message);
    throw err;
  }
}

/* =====================================================
   SPECIFIC MAIL FUNCTIONS (REPLACEMENT FOR OLD ONES)
   ===================================================== */

const sendUserCredentials = async (email, username, password) => {
  return sendMail({
    to: email,
    subject: "Your Account Details",
    html: `
      <h2>Welcome to Garud Classes</h2>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p>Please change your password after login.</p>
    `,
  });
};

const sendStudentCredentials = async (email, username, password) => {
  return sendMail({
    to: email,
    subject: "Student Account Details",
    html: `
      <h2>Welcome to Garud Classes</h2>
      <p><strong>Username:</strong> ${username}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p>Please change your password after login.</p>
    `,
  });
};

const sendFormConfirmation = async (email, message) => {
  return sendMail({
    to: email,
    subject: "Application Submitted Successfully",
    html: `<p>${message}</p>`,
  });
};

const sendStudentTimeTable = async (email, message) => {
  return sendMail({
    to: email,
    subject: "Time Table Updated",
    html: `<p>${message}</p>`,
  });
};

const sendAdmitCardUpdate = async (email, message) => {
  return sendMail({
    to: email,
    subject: "Admit Card Updated",
    html: `<p>${message}</p>`,
  });
};

// EXPORTS
module.exports = {
  sendUserCredentials,
  sendStudentCredentials,
  sendFormConfirmation,
  sendStudentTimeTable,
  sendAdmitCardUpdate,
};
