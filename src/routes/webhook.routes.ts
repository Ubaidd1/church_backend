import { Router } from "express";
import { handleStripeWebhook } from "../controllers/payment.controller";

const router = Router();

router.post("/", handleStripeWebhook);

export default router;
