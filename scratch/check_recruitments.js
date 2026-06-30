require("dotenv").config();
const mongoose = require("mongoose");
const Recruitment = require("../models/Recruitment");
const RecruitmentApplication = require("../models/RecruitmentApplication");

async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/garudclasses");
  console.log("Connected to MongoDB");

  let recruitment = await Recruitment.findOne();
  if (!recruitment) {
    recruitment = await Recruitment.create({
      title: "Math Teacher",
      department: "Academics",
      description: "Looking for an experienced Math Teacher",
      location: "Dehradun",
      status: "Open"
    });
    console.log("Created test recruitment:", recruitment.title);
  }

  let application = await RecruitmentApplication.findOne({ email: "testcandidate@example.com" });
  if (!application) {
    application = await RecruitmentApplication.create({
      recruitment: recruitment._id,
      fullName: "John Doe",
      email: "testcandidate@example.com",
      phone: "9876543210",
      resumeFile: "uploads/resumes/dummy.pdf",
      status: "Shortlisted",
      adminNotes: "Good candidate"
    });
    console.log("Created test application for John Doe");
  } else {
    console.log("Found existing application for John Doe:", application.status, "offerStatus:", application.offerStatus);
  }

  mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
