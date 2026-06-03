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
    type: String,
    required: true,
  },
  status: {
  type: String,
  enum: [
    "Pending",
    "Confirmed",
    "Paid",
    "Completed",
    "Cancelled"
  ],
  default: "Pending"
},

  // ✅ Payment fields added
  price: {
    type: Number,
    default: 0,
  },
  orderId: {
    type: String,
    default: "",
  },
  paymentId: {
    type: String,
    default: "",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
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