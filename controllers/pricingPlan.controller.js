import { PricingPlan } from "../models/pricingPlan.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/* ======================================================
   CREATE PRICING PLAN
====================================================== */

export const createPricingPlan = asyncHandler(async (req, res) => {
  const {
    name,
    duration,
    originalPrice,
    price,
    recommended,
    features,
    highlightBox,
  } = req.body;

  if (!name || !duration || !originalPrice || !price) {
    throw new ApiError(
      400,
      "Name, duration, original price and price required",
    );
  }

  const plan = await PricingPlan.create({
    name,
    duration,
    originalPrice,
    price,
    recommended,
    features,
    highlightBox,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, plan, "Pricing plan created successfully"));
});

/* ======================================================
   GET ALL PLANS (ADMIN)
====================================================== */

export const getAllPricingPlans = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const skip = (page - 1) * limit;

  const [plans, total] = await Promise.all([
    PricingPlan.find().sort({ price: 1 }).skip(skip).limit(limit),

    PricingPlan.countDocuments(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return res.status(200).json(
    new ApiResponse(200, {
      plans,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    }),
  );
});

/* ======================================================
   GET ACTIVE PLANS (PUBLIC WEBSITE)
====================================================== */

export const getActivePricingPlans = asyncHandler(async (req, res) => {
  const plans = await PricingPlan.find({ isActive: true }).sort({ price: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, plans, "Active pricing plans fetched"));
});

/* ======================================================
   GET SINGLE PLAN
====================================================== */

export const getPricingPlanById = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  const plan = await PricingPlan.findById(planId);

  if (!plan) {
    throw new ApiError(404, "Pricing plan not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, plan, "Pricing plan fetched"));
});

/* ======================================================
   UPDATE PLAN
====================================================== */

export const updatePricingPlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  const plan = await PricingPlan.findByIdAndUpdate(planId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!plan) {
    throw new ApiError(404, "Pricing plan not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, plan, "Pricing plan updated successfully"));
});

/* ======================================================
   DELETE PLAN (SOFT DELETE)
====================================================== */

export const deletePricingPlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;

  const plan = await PricingPlan.findByIdAndUpdate(
    planId,
    { isActive: false },
    { new: true },
  );

  if (!plan) {
    throw new ApiError(404, "Pricing plan not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Pricing plan deleted successfully"));
});
