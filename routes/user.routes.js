import { Router } from "express";
import {
  logoutUser,
  registerUser,
  getCurrentUser,
  updateAccountDetails,
  loginUser,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/current-user").get(verifyJWT, getCurrentUser);

router.route("/update-account").put(verifyJWT, updateAccountDetails);

export default router;
