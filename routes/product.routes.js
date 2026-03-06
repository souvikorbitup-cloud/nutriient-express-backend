import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getAllProductsName,
  getProductById,
  getProductsByCategoryName,
  getProductsByGoal,
  getProductsGroupedByGoal,
  updateProduct,
  updateProductGoal,
} from "../controllers/product.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizeRole from "../middlewares/role.middleware.js";
import { productUpload } from "../middlewares/multer.middleware.js";

const router = Router();

/* Public */
router.get("/", getAllProducts);
router.get("/all", getAllProductsName);
router.get("/category/:categoryName", getProductsByCategoryName);
router.get("/:productId", getProductById);
router.get("/recommendation/:goal", getProductsByGoal);

/* Admin / Manager */
router.post(
  "/",
  verifyJWT,
  authorizeRole("admin", "manager"),
  productUpload.fields([
    { name: "featureImage", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  createProduct,
);

router.put(
  "/:productId",
  verifyJWT,
  authorizeRole("admin", "manager"),
  productUpload.fields([
    { name: "featureImage", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  updateProduct,
);

router.delete(
  "/:productId",
  verifyJWT,
  authorizeRole("admin", "manager"),
  deleteProduct,
);

router.patch(
  "/:productId/goal",
  verifyJWT,
  authorizeRole("admin", "manager"),
  updateProductGoal,
);

router.get(
  "/goals/recommendations",
  verifyJWT,
  authorizeRole("admin", "manager"),
  getProductsGroupedByGoal,
);

export default router;
