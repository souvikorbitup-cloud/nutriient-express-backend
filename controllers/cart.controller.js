import { Cart } from "../models/cart.model.js";
import { Product } from "../models/product.model.js";
import { makeAbsoluteUrl } from "../utils/absoluteUrl.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCart = asyncHandler(async (req, res) => {
  const cartDoc = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
  );

  if (!cartDoc) {
    return res
      .status(200)
      .json(new ApiResponse(200, { items: [] }, "Cart fetched successfully"));
  }

  // Convert to plain JS object
  const cart = cartDoc.toObject();

  cart.items = cart.items.map((item) => {
    if (item.product) {
      item.product.featureImage = makeAbsoluteUrl(item.product.featureImage);

      if (Array.isArray(item.product.images)) {
        item.product.images = item.product.images.map(makeAbsoluteUrl);
      }
    }

    return item;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart fetched successfully"));
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  const product = await Product.findById(productId);
  if (!product || product.isOutOfStock) {
    throw new ApiError(400, "Product unavailable");
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [{ product: productId, quantity }],
    });

    return res
      .status(201)
      .json(new ApiResponse(201, cart, "Product added to cart"));
  }

  const item = cart.items.find((i) => i.product.toString() === productId);

  if (item) {
    item.quantity = Number(item.quantity) + Number(quantity);
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Product added to cart"));
});

/* =========================
   Update Cart Item Quantity
========================= */
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity < 1) {
    throw new ApiError(400, "Invalid product or quantity");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  const item = cart.items.find((i) => i.product.toString() === productId);

  if (!item) {
    throw new ApiError(404, "Cart item not found");
  }

  item.quantity = quantity;
  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart updated successfully"));
});

/* =========================
   Remove Cart Item
========================= */
export const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  cart.items = cart.items.filter((i) => i.product.toString() !== productId);

  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Item removed from cart"));
});

/* =========================
   Sync Guest Cart After Login
========================= */
export const syncCart = asyncHandler(async (req, res) => {
  const { cartItems } = req.body;
  // [{ productId, quantity }]

  if (!Array.isArray(cartItems)) {
    throw new ApiError(400, "Invalid cart data");
  }

  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  for (const item of cartItems) {
    const product = await Product.findById(item.productId);
    if (!product || product.isOutOfStock) continue;

    const requestedQty = Number(item.quantity) || 0;

    const existing = cart.items.find(
      (i) => i.product.toString() === item.productId,
    );

    if (existing) {
      //  total quantity after merge
      const totalQty = existing.quantity + requestedQty;

      //  clamp to stock
      existing.quantity = Math.min(totalQty, product.stock);
    } else {
      //  clamp to stock
      const finalQty = Math.min(requestedQty, product.stock);

      if (finalQty > 0) {
        cart.items.push({
          product: item.productId,
          quantity: finalQty,
        });
      }
    }
  }

  await cart.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cart, "Cart synced successfully"));
});
