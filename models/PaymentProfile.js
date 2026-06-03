const mongoose = require("mongoose");

const paymentProfileSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      role: {
        type: String,
        default: "",
      },

      upiId: {
        type: String,
        default: "",
      },

      phone: {
        type: String,
        default: "",
      },

      qrImage: {
        type: String,
        default: "",
      },

      instructions: {
        type: String,
        default: "",
      },

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "PaymentProfile",
    paymentProfileSchema
  );