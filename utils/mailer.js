const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

module.exports.sendUserCredentials = async (email, username, password) => {
  await transporter.sendMail({
    from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Account Details",
    html: `
      <h3>Welcome to Garud Classes</h3>
      <p><b>Username:</b> ${username}</p>
      <p><b>Password:</b> ${password}</p>
      <p>Please change your password after login.</p>
    `
  });
};

module.exports.sendStudentCredentials = async (email, username, password) => {
  await transporter.sendMail({
    from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Account Details",
    html: `
      <h3>Welcome to Garud Classes</h3>
      <p><b>Username:</b> ${username}</p>
      <p><b>Password:</b> ${password}</p>
      <p>Please change your password after login.</p>
    `
  });
};

module.exports.sendFormConfirmation = async (email,message) => {
  await transporter.sendMail({
    from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Application Submitted Successfully",
    html: `
      <p>${message}</p>
    `
  });
};

module.exports.sendStudentTimeTable = async (email,message) => {
  await transporter.sendMail({
    from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Time Table Updated",
    html: `
      <p>${message}</p>
    `
  });
};

module.exports.sendAdmitCardUpdate = async (email,message) => {
  await transporter.sendMail({
    from: `"Garud Classes" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Admit Card Updated",
    html: `
      <p>${message}</p>
    `
  });
};
