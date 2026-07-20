import { Router } from "express";
import {
  createCheckoutSession,
  getOrderBySession,
  validateRequest,
} from "../controllers/payment.controller";
import { createCheckoutSessionValidators } from "../validators/payment.validators";

const router = Router();

router.post(
  "/create-checkout-session",
  createCheckoutSessionValidators,
  validateRequest,
  createCheckoutSession
);

router.get("/order/:sessionId", getOrderBySession);

export default router;
