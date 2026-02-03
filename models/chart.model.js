import { Schema, model } from "mongoose";

const chartSchema = new Schema(
  {
    image: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1600,
      max: 3600,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

export const Chart = model("Chart", chartSchema);
