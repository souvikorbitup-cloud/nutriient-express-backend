import { Product } from "../models/product.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import path from "path";
import { Category } from "../models/category.model.js";
import { makeAbsoluteUrl } from "../utils/absoluteUrl.js";

export const createProduct = asyncHandler(async (req, res) => {
  const {
    category,
    subCategory,
    genericName,
    subGenericName,
    mrp,
    sellPrice,
    coursDuration,
    stock,
    shortDescription,
    fullDescription,
    descriptionForRecommendation,
    isRecommendation,
  } = req.body;

  if (
    !category ||
    !genericName ||
    !mrp ||
    !sellPrice ||
    !coursDuration ||
    stock === undefined
  ) {
    throw new ApiError(400, "Required fields are missing");
  }

  /* ---- Validate category ---- */
  const mainCategory = await Category.findById(category);
  if (!mainCategory) {
    throw new ApiError(400, "Category does not exist");
  }

  /* ---- Validate sub-category ---- */
  if (subCategory) {
    const subCat = await Category.findById(subCategory);
    if (!subCat || subCat.parent?.toString() !== category) {
      throw new ApiError(400, "Invalid sub-category for selected category");
    }
  }

  /* ---- Feature image ---- */
  if (!req.files?.featureImage?.[0]) {
    throw new ApiError(400, "Feature image is required");
  }

  const featureImage = `/products/${req.files.featureImage[0].filename}`;
  const images = req.files?.images?.map((f) => `/products/${f.filename}`) || [];

  const product = await Product.create({
    category,
    subCategory,
    genericName: genericName.trim(),
    subGenericName,
    mrp,
    sellPrice,
    coursDuration,
    stock,
    shortDescription,
    fullDescription,
    descriptionForRecommendation,
    isRecommendation,
    featureImage,
    images,
  });

  /* ---- Convert URLs to absolute ---- */
  const response = product.toObject();
  response.featureImage = makeAbsoluteUrl(response.featureImage);
  response.images = response.images.map(makeAbsoluteUrl);

  return res
    .status(201)
    .json(new ApiResponse(201, response, "Product created successfully"));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");

  const updateData = {};
  const allowedFields = [
    "category",
    "subCategory",
    "genericName",
    "subGenericName",
    "mrp",
    "sellPrice",
    "coursDuration",
    "stock",
    "shortDescription",
    "fullDescription",
    "descriptionForRecommendation",
    "isRecommendation",
  ];

  /* ---- Validate & assign body fields ---- */
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (
        ["category", "genericName"].includes(field) &&
        req.body[field].trim() === ""
      ) {
        throw new ApiError(400, `${field} cannot be empty`);
      }

      if (field === "stock" && req.body.stock < 0) {
        throw new ApiError(400, "Stock cannot be negative");
      }

      if (
        field === "coursDuration" &&
        !["day", "week", "month", "year"].includes(req.body.coursDuration)
      ) {
        throw new ApiError(400, "Invalid course duration");
      }

      updateData[field] =
        typeof req.body[field] === "string"
          ? req.body[field].trim()
          : req.body[field];
    }
  });

  /* ---- Feature image replace ---- */
  if (req.files?.featureImage?.[0]) {
    if (product.featureImage) {
      const oldPath = path.join(process.cwd(), "public", product.featureImage);
      fs.existsSync(oldPath) && fs.unlinkSync(oldPath);
    }
    updateData.featureImage = `/products/${req.files.featureImage[0].filename}`;
  }

  /* ---- Gallery images replace ---- */
  if (req.files?.images?.length) {
    product.images.forEach((img) => {
      const imgPath = path.join(process.cwd(), "public", img);
      fs.existsSync(imgPath) && fs.unlinkSync(imgPath);
    });
    updateData.images = req.files.images.map((f) => `/products/${f.filename}`);
  }

  if (!Object.keys(updateData).length) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    { $set: updateData },
    { new: true },
  );

  res
    .status(200)
    .json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");

  // Delete feature image
  if (product.featureImage) {
    const pathToFile = path.join(process.cwd(), "public", product.featureImage);
    if (fs.existsSync(pathToFile)) fs.unlinkSync(pathToFile);
  }

  // Delete gallery images
  product.images.forEach((img) => {
    const imgPath = path.join(process.cwd(), "public", img);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  });

  await Product.deleteOne({ _id: productId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find()
    .populate("category subCategory")
    .sort({ createdAt: -1 });

  const response = products.map((product) => {
    const data = product.toObject();
    data.featureImage = makeAbsoluteUrl(data.featureImage);
    data.images = data.images.map(makeAbsoluteUrl);
    return data;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Products fetched"));
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId).populate(
    "category subCategory",
  );

  if (!product) throw new ApiError(404, "Product not found");

  const response = product.toObject();
  response.featureImage = makeAbsoluteUrl(response.featureImage);
  response.images = response.images.map(makeAbsoluteUrl);

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Product fetched"));
});

export const getProductsByCategoryName = asyncHandler(async (req, res) => {
  const { categoryName } = req.params;

  if (!categoryName?.trim()) {
    throw new ApiError(400, "Category name is required");
  }

  const categories = await Category.find({
    name: { $regex: new RegExp(`^${categoryName.replaceAll("-", " ")}$`, "i") },
  });

  if (!categories.length) {
    throw new ApiError(404, "Category not found");
  }

  const categoryIds = categories.map((c) => c._id);

  const products = await Product.find({
    $or: [
      { category: { $in: categoryIds } },
      { subCategory: { $in: categoryIds } },
    ],
  })
    .populate("category subCategory")
    .sort({ createdAt: -1 });

  const response = products.map((product) => {
    const data = product.toObject();
    data.featureImage = makeAbsoluteUrl(data.featureImage);
    data.images = data.images.map(makeAbsoluteUrl);
    return data;
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        response,
        `Products fetched for category: ${categoryName}`,
      ),
    );
});
