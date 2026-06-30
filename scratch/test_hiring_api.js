require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const Staff = require("../models/Staff");
const Recruitment = require("../models/Recruitment");
const RecruitmentApplication = require("../models/RecruitmentApplication");

const BASE_URL = "http://localhost:4000";

async function runTests() {
  console.log("=== Starting Hiring API integration tests ===");

  // Connect to DB to verify state
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/garudclasses");
  
  // 1. Reset state
  await RecruitmentApplication.deleteMany({ email: "testcandidate@example.com" });
  await Staff.deleteMany({ email: "testcandidate@example.com" });
  await User.deleteMany({ username: "testcandidate@example.com" });

  let recruitment = await Recruitment.findOne({ title: "Math Teacher" });
  if (!recruitment) {
    recruitment = await Recruitment.create({
      title: "Math Teacher",
      department: "Academics",
      description: "Math Teacher job description",
      location: "Dehradun",
      status: "Open"
    });
  }

  const app = await RecruitmentApplication.create({
    recruitment: recruitment._id,
    fullName: "John Doe",
    email: "testcandidate@example.com",
    phone: "9876543210",
    resumeFile: "uploads/resumes/dummy.pdf",
    status: "Shortlisted",
    adminNotes: "Ready for offer"
  });

  console.log("Created test application:", app._id);

  // 2. Setup Axios Cookie Jar
  const instance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true
  });

  // Login
  const loginRes = await instance.post("/login", {
    username: "lokesh.1@garudclasses.com",
    password: "Admin123!"
  });
  
  // Get cookies
  const cookie = loginRes.headers['set-cookie'];
  instance.defaults.headers.Cookie = cookie;
  console.log("Admin logged in successfully");

  // 3. Test: Send Offer Letter
  console.log("Testing Send Offer Letter...");
  const sendOfferRes = await instance.post(`/admin/recruitments/${recruitment._id}/applications/${app._id}/send-offer`, {
    offerDesignation: "Mathematics Teacher",
    offerSalary: "8,00,000",
    offerJoiningDate: "2026-10-10"
  });

  // Verify DB state
  let updatedApp = await RecruitmentApplication.findById(app._id);
  console.log("- offerStatus:", updatedApp.offerStatus);
  console.log("- offerDesignation:", updatedApp.offerDesignation);
  if (updatedApp.offerStatus !== "Sent") {
    throw new Error("Offer status was not set to Sent");
  }

  // 4. Test: Public Signature Flow
  console.log("Testing Candidate Signature Flow...");
  const signRes = await axios.post(`${BASE_URL}/recruitments/offer-letter/${app._id}/accept`, {
    signature: "John Doe"
  });
  
  updatedApp = await RecruitmentApplication.findById(app._id);
  console.log("- offerStatus after signature:", updatedApp.offerStatus);
  console.log("- digitalSignature:", updatedApp.digitalSignature);
  if (updatedApp.offerStatus !== "Accepted" || updatedApp.digitalSignature !== "John Doe") {
    throw new Error("Candidate signature was not accepted");
  }

  // 5. Test: Hire Candidate Flow
  console.log("Testing Hire Candidate Flow...");
  await instance.post(`/admin/recruitments/${recruitment._id}/applications/${app._id}/hire`);
  
  updatedApp = await RecruitmentApplication.findById(app._id);
  console.log("- application status:", updatedApp.status);
  if (updatedApp.status !== "Hired") {
    throw new Error("Candidate status was not set to Hired");
  }

  // Verify user and staff were created
  const createdUser = await User.findOne({ username: "testcandidate@example.com" });
  const createdStaff = await Staff.findOne({ email: "testcandidate@example.com" });
  console.log("- User created:", !!createdUser, "Role:", createdUser?.role);
  console.log("- Staff created:", !!createdStaff, "Designation:", createdStaff?.designation);
  if (!createdUser || !createdStaff) {
    throw new Error("User or Staff record was not created on hire");
  }

  // 6. Test: Force Hire Flow (OTP check)
  console.log("Resetting state to test Force Hire...");
  await RecruitmentApplication.deleteMany({ email: "testcandidate@example.com" });
  await Staff.deleteMany({ email: "testcandidate@example.com" });
  await User.deleteMany({ username: "testcandidate@example.com" });

  const app2 = await RecruitmentApplication.create({
    recruitment: recruitment._id,
    fullName: "John Doe",
    email: "testcandidate@example.com",
    phone: "9876543210",
    resumeFile: "uploads/resumes/dummy.pdf",
    status: "Shortlisted",
    adminNotes: "Ready for force hire"
  });

  console.log("Testing Force Hire OTP generation...");
  const otpRes = await instance.post(`/admin/recruitments/${recruitment._id}/applications/${app2._id}/force-hire-otp`);
  console.log("- OTP Request Response:", otpRes.data);

  // Read OTP from session cookie/store or wait.
  // Wait, let's write a small trick to read the session state directly from the DB store if connect-mongo is used,
  // or we can read it from the session object inside the test since we are in the same Mongo instance!
  // Let's find the session from the sessions collection.
  const collections = await mongoose.connection.db.listCollections().toArray();
  const sessionColExists = collections.some(col => col.name === "sessions");
  let otpCode = "";
  if (sessionColExists) {
    const sessionDoc = await mongoose.connection.db.collection("sessions").findOne();
    if (sessionDoc) {
      const sessionData = JSON.parse(sessionDoc.session);
      otpCode = sessionData.forceHireOtp?.code;
      console.log("- Retrieved OTP from DB session store:", otpCode);
    }
  }

  if (!otpCode) {
    console.log("- Session collection not populated yet, trying direct verification check.");
    // Fallback: let's query the database or mock session directly in session.
    // Or we can just look up the OTP since we know it was generated.
    // Let's just retrieve the OTP by hacking the session document for our session.
  }

  // Since we might not be able to find the exact session in DB if it hasn't written, let's retrieve all documents in sessions:
  const sessionDocs = await mongoose.connection.db.collection("sessions").find().toArray();
  for (const doc of sessionDocs) {
    const sData = JSON.parse(doc.session);
    if (sData.forceHireOtp && sData.forceHireOtp.applicationId === app2._id.toString()) {
      otpCode = sData.forceHireOtp.code;
      break;
    }
  }
  console.log("- Found matching session OTP:", otpCode);

  if (!otpCode) {
    throw new Error("Could not retrieve OTP code from session store");
  }

  console.log("Confirming Force Hire with OTP...");
  await instance.post(`/admin/recruitments/${recruitment._id}/applications/${app2._id}/force-hire-confirm`, {
    otp: otpCode
  });

  updatedApp = await RecruitmentApplication.findById(app2._id);
  console.log("- application status after force hire:", updatedApp.status);
  if (updatedApp.status !== "Hired") {
    throw new Error("Force hire failed to update status to Hired");
  }

  const createdUser2 = await User.findOne({ username: "testcandidate@example.com" });
  const createdStaff2 = await Staff.findOne({ email: "testcandidate@example.com" });
  console.log("- User created after Force Hire:", !!createdUser2);
  console.log("- Staff created after Force Hire:", !!createdStaff2);
  if (!createdUser2 || !createdStaff2) {
    throw new Error("User or Staff record not created on force hire");
  }

  console.log("=== All Hiring integration tests passed successfully! ===");
  
  // Clean up
  await RecruitmentApplication.deleteMany({ email: "testcandidate@example.com" });
  await Staff.deleteMany({ email: "testcandidate@example.com" });
  await User.deleteMany({ username: "testcandidate@example.com" });
  
  mongoose.disconnect();
}

runTests().catch(err => {
  console.error("Test failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
