import express from "express";
import MenuItemController from "../controllers/MenuItemController.js";
import { jwtParse } from "../middleware/auth.js";

const router = express.Router();

router.post(
  "/",
//   jwtCheck,
  jwtParse,
  MenuItemController.createMenuItem
);

export default router;
