import express from "express";
import { jwtParse } from "../middleware/auth.js";
import OrderController from "../controllers/OrderController.js";

const router = express.Router();

router.get("/", jwtParse, OrderController.getMyOrders);

router.post(
    "/create",
    jwtParse,
    OrderController.createOrder
  );

  router.get(
    "/getOrdersWithDetails",
    jwtParse,
    OrderController.getOrdersWithDetails 
  );
  router.get(
    "/getTopSellingMenuItems",
    jwtParse,
    OrderController.getTopSellingMenuItems 
  );
  router.get(
    "/filterOrders",
    jwtParse,
    OrderController.filterOrders 
  );
  router.get(
    "/getRevenueByRestaurant",
    jwtParse,
    OrderController.getRevenueByRestaurant  
  );
  router.get(
    "/searchRestaurantsByCuisine",
    jwtParse,
    OrderController.searchRestaurantsByCuisine   
  );














router.post(
  "/checkout/create-checkout-session",
  jwtParse,
  OrderController.createCheckoutSession
);



// router.post("/checkout/webhook", OrderController.stripeWebhookHandler);

export default router;
