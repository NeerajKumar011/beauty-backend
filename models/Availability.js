const mongoose =
  require("mongoose");

const availabilitySchema =
  new mongoose.Schema(
    {
      closedDays: {
        type: [String],
        default: [],
      },

      closedDates: {
        type: [String],
        default: [],
      },

      openTime: {
        type: String,
        default: "10:00",
        trim: true,
      },

      closeTime: {
        type: String,
        default: "20:00",
        trim: true,
      },

      slotMinutes: {
        type: Number,
        default: 30,
        min: 5,
        max: 180,
      },

      maxBookingsPerDay: {
        type: Number,
        default: 20,
        min: 1,
        max: 500,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Availability",
    availabilitySchema
  );