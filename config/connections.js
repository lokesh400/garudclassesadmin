const mongoose = require("mongoose");

const queriesMongoUri = process.env.QUERIES_MONGO_URI || process.env.MONGO_URI;
const testMarksMongoUri = process.env.TESTMARKS_MONGO_URI || process.env.MONGO_URI;

const queryConnection = mongoose.createConnection(queriesMongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testMarksConnection = mongoose.createConnection(testMarksMongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

queryConnection.on("connected", () => {
  console.log("✅ Query MongoDB connected successfully");
});

queryConnection.on("error", (err) => {
  console.error("❌ Query MongoDB connection error:", err);
});

testMarksConnection.on("connected", () => {
  console.log("✅ Test Marks MongoDB connected successfully");
});

testMarksConnection.on("error", (err) => {
  console.error("❌ Test Marks MongoDB connection error:", err);
});

module.exports = {
  queryConnection,
  testMarksConnection,
};
