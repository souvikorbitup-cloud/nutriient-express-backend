import { Router } from "express";
import {
  createPricingPlan,
  getAllPricingPlans,
  getActivePricingPlans,
  getPricingPlanById,
  updatePricingPlan,
  deletePricingPlan,
} from "../controllers/pricingPlan.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizeRole from "../middlewares/role.middleware.js";

const router = Router();

/* ======================================================
   PUBLIC ROUTES (WEBSITE)
====================================================== */

router.get("/active", getActivePricingPlans);

/* ======================================================
   PROTECTED ROUTES
====================================================== */

router.use(verifyJWT);

/* ADMIN + MANAGER */
router.get("/", getAllPricingPlans);
router.get("/:planId", getPricingPlanById);

/* ======================================================
   ADMIN ONLY
====================================================== */

router.use(authorizeRole("admin", "manager"));

router.post("/", createPricingPlan);
router.put("/:planId", updatePricingPlan);
router.delete("/:planId", deletePricingPlan);

export default router;
