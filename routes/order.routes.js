import { Router } from "express";
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateDeliveryState,
  updateOrderByAdmin,
} from "../controllers/order.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizeRole from "../middlewares/role.middleware.js";

const router = Router();

/* -------- User -------- */
router.use(verifyJWT);

router.post("/", createOrder);
router.get("/my-orders", getMyOrders);
router.get("/:orderId", getOrderById);

/* -------- Admin / Manager -------- */
router.use(authorizeRole("admin", "manager"));

router.get("/", getAllOrders);
router.put("/:orderId/delivery-state", updateDeliveryState);
router.put("/:orderId", updateOrderByAdmin);


export default router;
