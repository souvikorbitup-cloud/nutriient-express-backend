import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Admin } from "../models/admin.model.js";
import fs from "fs";
import path from "path";
import { makeAbsoluteUrl } from "../utils/absoluteUrl.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";
import { Order } from "../models/order.model.js";

export const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if ([username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Username and password are required");
  }

  // Find admin
  const admin = await Admin.findOne({ username });
  if (!admin) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Verify password
  const isPasswordValid = await admin.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (admin?.avatar) {
    admin.avatar = makeAbsoluteUrl(admin.avatar);
  }

  // Generate token
  const token = admin.generateAccessToken();

  // Cookie options
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };

  // Remove password from response
  admin.password = undefined;

  return res
    .cookie("accessToken", token, options)
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          admin,
          accessToken: token,
        },
        "Login successful",
      ),
    );
}); // ✅

export const registerManager = asyncHandler(async (req, res) => {
  const { fullName, username, password, role } = req.body;

  // Validation - required fields
  if ([fullName, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Check if username already exists
  const existingAdmin = await Admin.findOne({ username });
  if (existingAdmin) {
    throw new ApiError(409, "Username already exists");
  }

  // Create admin (avatar will be added later)
  const admin = await Admin.create({
    fullName: fullName.trim(),
    username: username.trim(),
    password,
    role: role || "manager",
  });

  if (!admin) {
    throw new ApiError(500, "Failed to register admin");
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        admin,
      },
      "Manager registered successfully",
    ),
  );
}); // ✅

export const getCurrentAdmin = asyncHandler(async (req, res) => {
  if (req.user?.avatar) req.user.avatar = makeAbsoluteUrl(req.user.avatar);

  return res.status(200).json(new ApiResponse(200, req.user));
});

export const getAllManagers = asyncHandler(async (req, res) => {
  const managers = await Admin.find({ role: "manager" })
    .select("-password -__v")
    .sort({ createdAt: -1 });

  if (!managers.length) {
    throw new ApiError(404, "No managers found");
  }

  const response = managers.map((manager) => {
    const data = manager.toObject();
    data.avatar = makeAbsoluteUrl(data.avatar);
    return data;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Managers fetched successfully"));
}); // ✅

export const updateAdminAccountDetails = asyncHandler(async (req, res) => {
  const { fullName } = req.body;

  if (fullName !== undefined && fullName.trim() === "") {
    throw new ApiError(400, "Full name cannot be empty");
  }

  const admin = await Admin.findById(req.user._id);
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const updateData = {};

  if (fullName !== undefined) {
    updateData.fullName = fullName.trim();
  }

  // Avatar update
  if (req.file) {
    // Delete old avatar if exists
    if (admin.avatar) {
      const oldAvatarPath = path.join(
        process.cwd(),
        "public",
        admin.avatar.replace("/admin/", "admin/"),
      );

      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    updateData.avatar = `/admin/${req.file.filename}`;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const updatedAdmin = await Admin.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true },
  ).select("-password -__v");

  // Convert avatar to absolute URL
  const adminResponse = updatedAdmin.toObject();

  if (adminResponse.avatar) {
    adminResponse.avatar = makeAbsoluteUrl(adminResponse.avatar);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, adminResponse, "Admin profile updated successfully"),
    );
}); // ✅

export const updatePasswordHandler = asyncHandler(async (req, res) => {
  const { newPassword, managerId } = req.body;

  // Validation
  if (!newPassword || newPassword.trim() === "") {
    throw new ApiError(400, "New password is required");
  }

  const loggedInUser = req.user; // set by verifyJWT
  let targetAdmin;

  /**
   * CASE 1: Change own password (admin or manager)
   */
  if (!managerId) {
    targetAdmin = await Admin.findById(loggedInUser._id);

    if (!targetAdmin) {
      throw new ApiError(404, "User not found");
    }
  }

  /**
   * CASE 2: Admin changing manager password
   */
  if (managerId) {
    if (loggedInUser.role !== "admin") {
      throw new ApiError(403, "Only admin can change manager password");
    }

    targetAdmin = await Admin.findById(managerId);

    if (!targetAdmin) {
      throw new ApiError(404, "Manager not found");
    }

    if (targetAdmin.role !== "manager") {
      throw new ApiError(
        403,
        "Admin password cannot be changed by another admin",
      );
    }
  }

  // Update password (hashed automatically via pre-save hook)
  targetAdmin.password = newPassword;
  await targetAdmin.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password updated successfully"));
}); // ✅

export const deleteManagerAccount = asyncHandler(async (req, res) => {
  const { managerId } = req.params;

  // Validate ID
  if (!managerId) {
    throw new ApiError(400, "Manager ID is required");
  }

  // Find manager
  const manager = await Admin.findById(managerId);

  if (!manager) {
    throw new ApiError(404, "Manager not found");
  }

  // Prevent deleting admin
  if (manager.role !== "manager") {
    throw new ApiError(403, "Only managers can be deleted");
  }

  // Delete avatar if exists
  if (manager.avatar) {
    const avatarPath = path.join(
      process.cwd(),
      "public",
      manager.avatar.replace("/admin/", "admin/"),
    );

    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }
  }

  // Delete manager account
  await Admin.deleteOne({ _id: managerId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Manager deleted successfully"));
}); // ✅

export const logoutAdmin = asyncHandler(async (req, res) => {
  // reset cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "admin logged out successfully"));
}); // ✅

export const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [users, totalUsers] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          totalUsers,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Users fetched successfully",
    ),
  );
}); // ✅

export const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const [totalProducts, totalUsers, totalCategories, totalOrders] =
    await Promise.all([
      Product.countDocuments(),
      User.countDocuments(),
      Category.countDocuments(),
      Order.countDocuments(),
    ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalProducts,
        totalUsers,
        totalCategories,
        totalOrders,
      },
      "Dashboard stats fetched successfully",
    ),
  );
}); // ✅
