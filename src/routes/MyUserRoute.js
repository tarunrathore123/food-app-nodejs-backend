import express from "express";
import MyUserController from "../controllers/MyUserController.js";
import { jwtParse } from "../middleware/auth.js";
// import { validateMyUserRequest } from "../middleware/validation";

const router = express.Router();

// /api/my/user
router.get("/", jwtParse, MyUserController.getCurrentUser);
router.post("/", MyUserController.createCurrentUser);
router.put(
  "/",
  jwtParse,
//   validateMyUserRequest,
  MyUserController.updateCurrentUser
);

export default router;
