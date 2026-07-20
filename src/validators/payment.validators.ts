import { body } from "express-validator";

export const createCheckoutSessionValidators = [
  body("customerName")
    .trim()
    .notEmpty()
    .withMessage("customerName is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("customerName must be between 2 and 100 characters"),
  body("customerEmail")
    .trim()
    .notEmpty()
    .withMessage("customerEmail is required")
    .isEmail()
    .withMessage("customerEmail must be a valid email")
    .normalizeEmail(),
  body("cartItems")
    .isArray({ min: 1 })
    .withMessage("cartItems must be a non-empty array"),
  body("cartItems.*.productId")
    .trim()
    .notEmpty()
    .withMessage("Each cart item requires productId"),
  body("cartItems.*.quantity")
    .isInt({ min: 1, max: 99 })
    .withMessage("Each cart item quantity must be an integer between 1 and 99"),
  body("shippingFee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("shippingFee must be a non-negative number"),
];
