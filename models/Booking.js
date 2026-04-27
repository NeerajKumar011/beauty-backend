const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  name: {
  type: String,
  required: true,
  trim: true,
},
  service: {
  type: String,
  required: true,
  trim: true,
},
  date: {
  type: String,
  required: true,
  trim: true,
},
  time: {
  type: String,
  required: true,
  trim: true,
},
  userId: {
    type: String, // later we can convert to ObjectId
    required: true,
  },
  status: {
  type: String,
  default: "Pending",
},
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

bookingSchema.index(
  { date: 1, time: 1 },
  { unique: true }
);
module.exports = mongoose.model("Booking", bookingSchema);