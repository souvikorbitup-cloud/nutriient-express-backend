import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    altMobile: {
      type: String,
      trim: true,
    },

    age: {
      type: Number,
      min: 10,
      max: 100,
    },

    gender: {
      type: String,
      enum: ["male", "female", "unset"],
      default: "unset",
      index: true,
    },

    weight: {
      type: Number,
      min: 20, // realistic lower bound in kg
      max: 300, // realistic upper bound
    },

    bodyType: {
      type: String,
      enum: ["Fat But Fit", "Very Fat", "Skinny", "Muscular/Lean"],
    },

    address: {
      landmark: String,
      state: String,
      city: String,
      zipCode: String,
    },

  },
  {
    timestamps: true,
  },
);

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      fullName: this.fullName,
      mobile: this.mobile,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

export const User = mongoose.model("User", userSchema);
