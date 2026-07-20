import { Router } from "express";
import { handleStripeWebhook } from "../controllers/payment.controller";

const router = Router();

router.post("/", (req, res, next) => {
  void handleStripeWebhook(req, res, next);
});

export default router;
