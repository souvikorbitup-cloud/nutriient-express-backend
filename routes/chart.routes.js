import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizeRole from "../middlewares/role.middleware.js";
import { fileUpload } from "../middlewares/multer.middleware.js";
import {
  addChart,
  showAllCharts,
  updateSelectedChart,
  deleteChart,
} from "../controllers/chart.controller.js";

const router = Router();

/**
 * Charts (Admin & Manager only)
 */

// Add chart (image REQUIRED)
router.post(
  "/",
  verifyJWT,
  authorizeRole("admin", "manager"),
  fileUpload("charts").single("image"),
  addChart,
);

// Get all charts
router.get("/", verifyJWT, authorizeRole("admin", "manager"), showAllCharts);

// Update chart (image OPTIONAL)
router.patch(
  "/:chartId",
  verifyJWT,
  authorizeRole("admin", "manager"),
  fileUpload("charts").single("image"),
  updateSelectedChart,
);

// Delete chart
router.delete(
  "/:chartId",
  verifyJWT,
  authorizeRole("admin", "manager"),
  deleteChart,
);

export default router;
