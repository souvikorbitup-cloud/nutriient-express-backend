import { Router } from "express";
import {
  addToCart,
  getCart,
  removeCartItem,
  syncCart,
  updateCartItem,
} from "../controllers/cart.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/* -------- Authenticated User -------- */
router.use(verifyJWT);

router.get("/", getCart);
router.post("/", addToCart);
router.put("/", updateCartItem);
router.delete("/remove/:productId", removeCartItem);
router.post("/sync", syncCart);

export default router;
