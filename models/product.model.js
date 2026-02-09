import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    subGenericName: String,

    mrp: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    sellPrice: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    coursDuration: {
      type: String,
      enum: ["day", "week", "month", "year"],
      required: true,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    isOutOfStock: {
      type: Boolean,
      default: false,
    },

    isRecommendation: {
      type: Boolean,
      default: false,
    },

    shortDescription: String,
    fullDescription: String,
    descriptionForRecommendation: String,

    featureImage: {
      type: String,
      required: true,
    },

    images: [String],
  },
  { timestamps: true },
);

/* CREATE / SAVE */
productSchema.pre("save", function () {
  this.isOutOfStock = this.stock <= 0;
});

/* UPDATE */
productSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function (next) {
    const update = this.getUpdate();

    const stock = update?.stock ?? update?.$set?.stock;

    if (stock !== undefined) {
      if (!update.$set) update.$set = {};
      update.$set.isOutOfStock = stock <= 0;
    }

    next();
  },
);

export const Product = mongoose.model("Product", productSchema);
