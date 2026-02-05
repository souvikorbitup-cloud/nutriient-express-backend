import fs from "fs";
import path from "path";
import { Chart } from "../models/chart.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { makeAbsoluteUrl } from "../utils/absoluteUrl.js";

/* ======================================================
   HELPERS
====================================================== */
export const deleteFileIfExists = (filePath) => {
  if (!filePath) return;

  // remove leading slash if exists
  const normalizedPath = filePath.startsWith("/")
    ? filePath.slice(1)
    : filePath;

  // absolute path to uploads directory
  const absolutePath = path.join(
    process.cwd(), // project root
    "public", // your static folder
    normalizedPath, // charts/3300.webp
  );

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

/* ======================================================
   ADD CHART (IMAGE REQUIRED)
====================================================== */
export const addChart = asyncHandler(async (req, res) => {
  const { value, description } = req.body;

  if (!req.file || !value) {
    throw new ApiError(400, "Image and value are required");
  }

  // prevent duplicate value
  const existingChart = await Chart.findOne({ value });
  if (existingChart) {
    deleteFileIfExists(`/charts/${req.file.filename}`);
    throw new ApiError(409, "Chart with this value already exists");
  }

  const chart = await Chart.create({
    image: `/charts/${req.file.filename}`,
    value,
    description,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, chart, "Chart added successfully"));
});

/* ======================================================
   DELETE CHART (DELETE IMAGE FROM DISK)
====================================================== */
export const deleteChart = asyncHandler(async (req, res) => {
  const { chartId } = req.params;

  const chart = await Chart.findById(chartId);
  if (!chart) {
    throw new ApiError(404, "Chart not found");
  }

  // delete image from disk
  deleteFileIfExists(chart.image);

  await chart.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Chart deleted successfully"));
});

/* ======================================================
   SHOW ALL CHARTS (WITH PAGINATION)
====================================================== */
export const showAllCharts = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [charts, totalCharts] = await Promise.all([
    Chart.find().sort({ value: 1 }).skip(skip).limit(limit).lean(),
    Chart.countDocuments(),
  ]);

  // ✅ make image URLs absolute
  const formattedCharts = charts.map((chart) => ({
    ...chart,
    image: makeAbsoluteUrl(chart.image),
  }));

  const totalPages = Math.ceil(totalCharts / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        charts: formattedCharts,
        pagination: {
          totalCharts,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      "Charts fetched successfully",
    ),
  );
});

/* ======================================================
   UPDATE SELECTED CHART (IMAGE OPTIONAL)
====================================================== */
export const updateSelectedChart = asyncHandler(async (req, res) => {
  const { chartId } = req.params;
  const { value, description } = req.body;

  const chart = await Chart.findById(chartId);
  if (!chart) {
    throw new ApiError(404, "Chart not found");
  }

  // prevent duplicate value
  if (value && value !== chart.value) {
    const exists = await Chart.findOne({
      value,
      _id: { $ne: chartId },
    });

    if (exists) {
      if (req.file) deleteFileIfExists(`/charts/${req.file.filename}`);
      throw new ApiError(409, "Chart with this value already exists");
    }
  }

  // if new image uploaded → delete old image
  if (req.file) {
    deleteFileIfExists(chart.image);
    chart.image = `/charts/${req.file.filename}`;
  }

  if (value !== undefined) chart.value = value;
  if (description !== undefined) chart.description = description;

  await chart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, chart, "Chart updated successfully"));
});
