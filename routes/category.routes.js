import { Router } from "express";
import {
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  getAllCategoriesHandler,
  getCategoriesByTypeHandler,
} from "../controllers/category.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizeRole from "../middlewares/role.middleware.js";

const router = Router();

/* USER */
router.get("/", getAllCategoriesHandler);
router.get("/type", getCategoriesByTypeHandler);

/* ADMIN & MANAGER */
router.post(
  "/",
  verifyJWT,
  authorizeRole("admin", "manager"),
  createCategoryHandler,
);
router.put(
  "/:categoryId",
  verifyJWT,
  authorizeRole("admin", "manager"),
  updateCategoryHandler,
);
router.delete(
  "/:categoryId",
  verifyJWT,
  authorizeRole("admin", "manager"),
  deleteCategoryHandler,
);

export default router;
