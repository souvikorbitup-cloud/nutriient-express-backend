import mongoose from "mongoose";

const pricingPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: String,
      required: true, // One Month / Six Months / Twelve Months
    },

    originalPrice: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    savePercentage: {
      type: Number,
      default: 0,
    },

    recommended: {
      type: Boolean,
      default: false,
    },

    features: [
      {
        type: String,
      },
    ],

    highlightBox: {
      title: String,
      description: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

/* =========================
   AUTO CALCULATE SAVE %
========================= */

pricingPlanSchema.pre("save", function () {
  if (this.originalPrice && this.price) {
    const discount =
      ((this.originalPrice - this.price) / this.originalPrice) * 100;

    this.savePercentage = Math.round(discount);
  }
});

/* =========================
   UPDATE CALCULATION
========================= */

pricingPlanSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();

  const originalPrice = update.originalPrice || update.$set?.originalPrice;
  const price = update.price || update.$set?.price;

  if (originalPrice && price) {
    const discount = ((originalPrice - price) / originalPrice) * 100;

    if (!update.$set) update.$set = {};
    update.$set.savePercentage = Math.round(discount);
  }
});

export const PricingPlan = mongoose.model("PricingPlan", pricingPlanSchema);
