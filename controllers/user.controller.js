import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, mobile, age, gender, weight, bodyType } = req.body;

  // validation - not empty
  if ([fullName, mobile].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All filds are required");
  }

  // check if user already exist - username and email
  const existedUser = await User.findOne({
    mobile,
  });

  if (existedUser) {
    throw new ApiError(409, "mobile already exist");
  }

  // create user object - create entry in db
  const createData = {
    fullName,
    mobile,
  };

  // Optional profile fields (only set if provided)
  if (email !== undefined) {
    createData.email = email;
  }

  if (age !== undefined) {
    createData.age = age;
  }

  if (gender !== undefined) {
    createData.gender = gender;
  }

  if (weight !== undefined) {
    createData.weight = weight;
  }

  if (bodyType !== undefined) {
    createData.bodyType = bodyType;
  }

  const user = await User.create(createData);

  // check for user creation
  if (!user) {
    throw new ApiError(500, "Something went wrong while registerimg the user");
  }
  // send cookie
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  // generateToken
  const token = await user.generateAccessToken();

  return res
    .cookie("accessToken", token, options)
    .json(
      new ApiResponse(
        201,
        { user: user, accessToken: token },
        "Register successful",
      ),
    );
}); // ✅

export const loginUser = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  // validation - not empty
  if ([mobile].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All filds are required");
  }

  const user = await User.findOne({ mobile });
  if (!user) throw new ApiError(400, "User not found");

  // send cookie
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  // generateToken
  const token = await user.generateAccessToken();

  return res
    .cookie("accessToken", token, options)
    .json(
      new ApiResponse(
        201,
        { user: user, accessToken: token },
        "Login successful",
      ),
    );
}); // ✅

export const logoutUser = asyncHandler(async (req, res) => {
  // reset cookie
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfully"));
}); // ✅

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user));
}); // ✅

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, address, altMobile, age, gender, weight, bodyType } =
    req.body;

  // Validation: fullName cannot be empty (if provided)
  if (fullName !== undefined && fullName.trim() === "") {
    throw new ApiError(400, "Full name cannot be empty");
  }

  // Build update object (only allowed fields)
  const updateData = {};

  if (fullName !== undefined) {
    updateData.fullName = fullName.trim();
  }

  if (altMobile !== undefined) {
    updateData.altMobile = altMobile.trim();
  }

  if (address !== undefined) {
    updateData.address = {
      landmark: address?.landmark,
      state: address?.state,
      city: address?.city,
      zipCode: address?.zipCode,
    };
  }

  // Optional profile fields
  if (age !== undefined) {
    updateData.age = age;
  }
  
  if (email !== undefined) {
    updateData.email = email.trim();
  }

  if (gender !== undefined) {
    updateData.gender = gender;
  }

  if (weight !== undefined) {
    updateData.weight = weight;
  }

  if (bodyType !== undefined) {
    updateData.bodyType = bodyType;
  }

  // Nothing to update
  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  ).select("-__v");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res.json(
    new ApiResponse(200, updatedUser, "Profile updated successfully"),
  );
}); // ✅
