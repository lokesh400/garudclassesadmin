const mongoose = require("mongoose");
const Query = require("../models/Query");
const FollowUp = require("../models/FollowUp");
const Marks = require("../models/Marks");

// Re-define schemas to use for temporary primary models
const querySchema = Query.schema;
const followUpSchema = FollowUp.schema;
const marksSchema = Marks.schema;

const migrateData = async () => {
  try {
    // Ensure default connection is fully open
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once("open", resolve));
    }
    
    console.log("🔄 Running background MongoDB migration check...");

    // Setup temporary primary models pointing to the original collections
    const PrimaryQuery = mongoose.connection.model("PrimaryQuery", querySchema, "queries");
    const PrimaryFollowUp = mongoose.connection.model("PrimaryFollowUp", followUpSchema, "followups");
    const PrimaryMarks = mongoose.connection.model("PrimaryMarks", marksSchema, "marks");

    // Migrate Queries
    if (process.env.QUERIES_MONGO_URI && process.env.QUERIES_MONGO_URI !== process.env.MONGO_URI) {
      const primaryQueries = await PrimaryQuery.find().lean();
      if (primaryQueries.length > 0) {
        // Fetch existing target IDs
        const existingTargetQueries = await Query.find({}, { _id: 1 }).lean();
        const targetQueryIds = new Set(existingTargetQueries.map(q => q._id.toString()));
        
        const queriesToInsert = primaryQueries.filter(q => !targetQueryIds.has(q._id.toString()));
        if (queriesToInsert.length > 0) {
          await Query.insertMany(queriesToInsert, { ordered: false });
          console.log(`✅ Migrated ${queriesToInsert.length} queries to separated Query DB`);
        } else {
          console.log("ℹ️ No new queries to migrate to Query DB");
        }
      }

      const primaryFollowUps = await PrimaryFollowUp.find().lean();
      if (primaryFollowUps.length > 0) {
        const existingTargetFollowUps = await FollowUp.find({}, { _id: 1 }).lean();
        const targetFollowUpIds = new Set(existingTargetFollowUps.map(f => f._id.toString()));

        const followUpsToInsert = primaryFollowUps.filter(f => !targetFollowUpIds.has(f._id.toString()));
        if (followUpsToInsert.length > 0) {
          await FollowUp.insertMany(followUpsToInsert, { ordered: false });
          console.log(`✅ Migrated ${followUpsToInsert.length} follow-ups to separated Query DB`);
        } else {
          console.log("ℹ️ No new follow-ups to migrate to Query DB");
        }
      }
    }

    // Migrate Test Marks
    if (process.env.TESTMARKS_MONGO_URI && process.env.TESTMARKS_MONGO_URI !== process.env.MONGO_URI) {
      const primaryMarks = await PrimaryMarks.find().lean();
      if (primaryMarks.length > 0) {
        const existingTargetMarks = await Marks.find({}, { _id: 1 }).lean();
        const targetMarksIds = new Set(existingTargetMarks.map(m => m._id.toString()));

        const marksToInsert = primaryMarks.filter(m => !targetMarksIds.has(m._id.toString()));
        if (marksToInsert.length > 0) {
          await Marks.insertMany(marksToInsert, { ordered: false });
          console.log(`✅ Migrated ${marksToInsert.length} test marks to separated Test Marks DB`);
        } else {
          console.log("ℹ️ No new test marks to migrate to Test Marks DB");
        }
      }
    }

    console.log("🏁 Migration check and sync completed successfully");
  } catch (err) {
    console.error("⚠️ Migration check warning/error:", err.message);
  }
};

module.exports = {
  migrateData,
};
