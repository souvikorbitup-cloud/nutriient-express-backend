import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  getProductsByCategoryName,
  updateProduct,
} from "../controllers/product.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizeRole from "../middlewares/role.middleware.js";
import { productUpload } from "../middlewares/multer.middleware.js";

const router = Router();

/* Public */
router.get("/", getAllProducts);
router.get("/category/:categoryName", getProductsByCategoryName);
router.get("/:productId", getProductById);

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

export default router;
