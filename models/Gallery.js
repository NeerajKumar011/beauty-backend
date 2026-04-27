const mongoose =
  require("mongoose");

const gallerySchema =
  new mongoose.Schema(
    {
      imageUrl: String,
      publicId: String,
      title: String,
      category: String,
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Gallery",
    gallerySchema
  );