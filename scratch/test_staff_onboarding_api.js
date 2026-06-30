const mongoose = require("mongoose");
const Staff = require("../models/Staff");
const User = require("../models/User");
const dotenv = require("dotenv");

dotenv.config();

// Define mock session
const reqSession = {};

async function testWorkflow() {
  console.log("Connecting to Database...");
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/garudclasses");
  console.log("Connected.");

  try {
    // 1. Clean up old test staff
    console.log("Cleaning up old test users/staff...");
    await Staff.deleteMany({ email: "onboardtest@garudclasses.com" });
    await User.deleteMany({ username: "onboardtest@garudclasses.com" });

    // 2. Create staff & user (simulating /admin/staff/add)
    console.log("Creating new test staff...");
    const user = new User({
      name: "Onboard Test Staff",
      username: "onboardtest@garudclasses.com",
      email: "onboardtest@garudclasses.com",
      role: "teacher"
    });
    await User.register(user, "TestPass123!");

    const staff = await Staff.create({
      name: "Onboard Test Staff",
      email: "onboardtest@garudclasses.com",
      department: "Academics",
      designation: "TEACHER",
      linkedUsers: [user._id],
      status: "Inactive",
      hiringStatus: "Pending"
    });

    console.log(`Created Staff ID: ${staff._id}. hiringStatus: ${staff.hiringStatus}, offerStatus: ${staff.offerStatus}`);

    // 3. Simulate Send Offer Letter
    console.log("Sending Offer Letter...");
    staff.offerStatus = "Sent";
    staff.offerDesignation = "Senior Teacher";
    staff.offerSalary = "6,00,000 Per Annum";
    staff.offerJoiningDate = new Date();
    await staff.save();
    console.log(`Staff offer status updated to: ${staff.offerStatus}`);

    // 4. Simulate Candidate Acceptance (Digital Signature)
    console.log("Simulating candidate offer signature...");
    if (staff.offerStatus !== "Sent") throw new Error("Offer was not sent!");
    staff.offerStatus = "Accepted";
    staff.digitalSignature = "Onboard Test Staff";
    staff.offerSignedAt = new Date();
    await staff.save();
    console.log(`Staff offer status updated to: ${staff.offerStatus}, Signature: ${staff.digitalSignature}`);

    // 5. Onboard / Hire Staff
    console.log("Onboarding & Activating Staff...");
    if (staff.offerStatus !== "Accepted") throw new Error("Offer was not accepted!");
    staff.hiringStatus = "Hired";
    staff.status = "Active";
    await staff.save();
    
    // Also propagate status change to User
    const isUserActive = staff.status === "Active";
    await User.updateMany({ _id: { $in: staff.linkedUsers } }, { $set: { isActive: isUserActive } });

    // Reload and check
    const updatedStaff = await Staff.findById(staff._id);
    const updatedUser = await User.findById(user._id);
    console.log(`Updated Staff: hiringStatus: ${updatedStaff.hiringStatus}, status: ${updatedStaff.status}`);
    console.log(`Updated User isActive: ${updatedUser.isActive}`);

    if (updatedStaff.hiringStatus === "Hired" && updatedUser.isActive === true) {
      console.log("✅ Onboarding signature-based workflow PASSED!");
    } else {
      throw new Error("Workflow failed to update correctly!");
    }

    // 6. Test Force Onboard OTP flow
    console.log("\nTesting Force Onboard Workflow...");
    // Reset staff to Pending
    staff.hiringStatus = "Pending";
    staff.offerStatus = "None";
    staff.status = "Inactive";
    await staff.save();

    console.log("Generating OTP...");
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    reqSession.forceHireOtp = {
      code: otpCode,
      staffId: staff._id.toString(),
      expiresAt: Date.now() + 5 * 60 * 1000
    };
    console.log(`OTP generated: ${otpCode}`);

    // Confirm Force Onboard
    console.log("Verifying OTP and force onboarding...");
    const enteredOtp = otpCode;
    const sessionOtp = reqSession.forceHireOtp;
    if (
      !sessionOtp ||
      sessionOtp.staffId !== staff._id.toString() ||
      sessionOtp.code !== enteredOtp.trim() ||
      sessionOtp.expiresAt < Date.now()
    ) {
      throw new Error("OTP validation failed!");
    }

    reqSession.forceHireOtp = null;
    staff.hiringStatus = "Hired";
    staff.status = "Active";
    await staff.save();

    const finalStaff = await Staff.findById(staff._id);
    console.log(`Final Staff hiringStatus: ${finalStaff.hiringStatus}, status: ${finalStaff.status}`);
    if (finalStaff.hiringStatus === "Hired") {
      console.log("✅ Force Onboard OTP verification workflow PASSED!");
    } else {
      throw new Error("Force onboarding failed!");
    }

  } catch (error) {
    console.error("❌ Test Failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

testWorkflow();
