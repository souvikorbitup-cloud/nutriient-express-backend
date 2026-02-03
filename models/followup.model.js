import { Schema, model } from "mongoose";

const followUpSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    comments: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      enum: ["agree", "disagree"],
      required: true,
    },
  },
  { timestamps: true },
);

export const FollowUp = model("FollowUp", followUpSchema);
