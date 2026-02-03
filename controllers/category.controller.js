import { Category } from "../models/category.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createCategoryHandler = asyncHandler(async (req, res) => {
  const { name, parent, type } = req.body;

  if (!name || !type) {
    throw new ApiError(400, "Name and type are required");
  }

  // If parent provided, validate
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      throw new ApiError(404, "Parent category not found");
    }
  }

  const category = await Category.create({
    name: name.trim(),
    parent: parent || null,
    type,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
}); // ✅

export const updateCategoryHandler = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name, parent, type } = req.body;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  if (name !== undefined && name.trim() === "") {
    throw new ApiError(400, "Category name cannot be empty");
  }

  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      throw new ApiError(404, "Parent category not found");
    }
  }

  if (name !== undefined) category.name = name.trim();
  if (parent !== undefined) category.parent = parent;
  if (type !== undefined) category.type = type;

  await category.save();

  return res.json(
    new ApiResponse(200, category, "Category updated successfully"),
  );
}); // ✅

export const deleteCategoryHandler = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Delete sub-categories first
  await Category.deleteMany({ parent: categoryId });
  await Category.deleteOne({ _id: categoryId });

  return res.json(new ApiResponse(200, null, "Category deleted successfully"));
}); // ✅

export const getAllCategoriesHandler = asyncHandler(async (req, res) => {
  const categories = await Category.aggregate([
    {
      $match: { parent: null },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "parent",
        as: "subCategories",
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res.json(
    new ApiResponse(200, categories, "Categories fetched successfully"),
  );
}); // ✅

export const getCategoriesByTypeHandler = asyncHandler(async (req, res) => {
  const categories = await Category.aggregate([
    // Only top-level categories
    {
      $match: { parent: null },
    },

    // Lookup sub-categories
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "parent",
        as: "subCategories",
      },
    },

    // Group by type
    {
      $group: {
        _id: "$type",
        categories: {
          $push: {
            _id: "$_id",
            name: "$name",
            type: "$type",
            subCategories: "$subCategories",
            createdAt: "$createdAt",
          },
        },
      },
    },

    // Clean response
    {
      $project: {
        _id: 0,
        type: "$_id",
        categories: 1,
      },
    },

    // Sort by type name
    {
      $sort: { type: 1 },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        categories,
        "Categories grouped by type fetched successfully",
      ),
    );
}); // ✅
