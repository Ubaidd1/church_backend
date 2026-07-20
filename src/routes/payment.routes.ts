import { Router } from "express";
import {
  createCheckoutSession,
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

export default router;
