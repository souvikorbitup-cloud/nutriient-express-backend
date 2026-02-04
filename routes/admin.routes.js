import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  deleteManagerAccount,
  getAdminDashboardStats,
  getAllManagers,
  getAllUsers,
  getCurrentAdmin,
  loginAdmin,
  logoutAdmin,
  registerManager,
  updateAdminAccountDetails,
  updatePasswordHandler,
} from "../controllers/admin.controller.js";
import authorizeRole from "../middlewares/role.middleware.js";
import { fileUpload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/login").post(loginAdmin);

// router
//   .route("/register")
//   .post(registerManager);

// secured routes
router
  .route("/register")
  .post(verifyJWT, authorizeRole("admin"), registerManager);

router
  .route("/current-admin")
  .get(verifyJWT, authorizeRole("admin", "manager"), getCurrentAdmin);

router
  .route("/all-managars")
  .get(verifyJWT, authorizeRole("admin"), getAllManagers);

router
  .route("/update-account")
  .put(
    verifyJWT,
    authorizeRole("admin", "manager"),
    fileUpload("admin").single("avatar"),
    updateAdminAccountDetails,
  );

router
  .route("/update-password")
  .put(verifyJWT, authorizeRole("admin", "manager"), updatePasswordHandler);

router
  .route("/delete-account/:managerId")
  .delete(verifyJWT, authorizeRole("admin"), deleteManagerAccount);

router
  .route("/logout")
  .post(verifyJWT, authorizeRole("admin", "manager"), logoutAdmin);

router
  .route("/users")
  .get(verifyJWT, authorizeRole("admin", "manager"), getAllUsers);

router
  .route("/stats")
  .get(verifyJWT, authorizeRole("admin", "manager"), getAdminDashboardStats);

export default router;
