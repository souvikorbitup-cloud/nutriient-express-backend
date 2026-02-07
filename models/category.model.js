import mongoose, { Schema } from "mongoose";

const categorySchema = Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null, // null = top-level category
    },

    level: {
      type: Number,
      default: 0, // 0 = category, 1 = sub-category, etc.
    },

    type: {
      type: String,
      enum: ["Health Supplements", "Health Pre Packs", "Vitamins"],
      required: true,
    },
  },
  { timestamps: true },
);

categorySchema.pre("save", function () {
  this.level = this.parent ? 1 : 0;
});

export const Category = mongoose.model("Category", categorySchema);
