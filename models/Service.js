const mongoose =
  require("mongoose");

const serviceSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      price: {
        type: Number,
        required: true,
        trim: true,
      },

      time: {
        type: String,
        required: true,
        trim: true,
      },
      category: {
        type: String,
        default: "",
      },
      description: {
        type: String,
        default: "",
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

serviceSchema.index(
  { name: 1 },
  { unique: true }
);

module.exports =
  mongoose.model(
    "Service",
    serviceSchema
  );