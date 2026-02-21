import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { makeAbsoluteUrl } from "../utils/absoluteUrl.js";
import sendEmail from "../utils/sendEmail.js";

/* =========================
   CREATE ORDER (COD)
========================= */
export const createOrder = asyncHandler(async (req, res) => {
  const { paymentMode, shippingAddress, orderSource = "GENERAL" } = req.body;

  if (!shippingAddress || !paymentMode) {
    throw new ApiError(400, "Shipping address and payment mode are required");
  }

  if (paymentMode !== "COD") {
    throw new ApiError(400, "Only COD is supported currently");
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
  );

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderDetails = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id).session(session);

      if (!product || product.isOutOfStock) {
        throw new ApiError(400, `${item.product.genericName} is out of stock`);
      }

      if (product.stock < item.quantity) {
        throw new ApiError(
          400,
          `Only ${product.stock} items left for ${item.product.genericName}`,
        );
      }

      product.stock -= item.quantity;
      await product.save({ session });

      orderDetails.push({
        product: product._id,
        quantity: item.quantity,
        price: product.sellPrice,
      });
    }

    const orderDocs = await Order.create(
      [
        {
          user: req.user._id,
          orderDetails,
          paymentMode,
          orderSource,
          shippingAddress,
        },
      ],
      { session },
    );

    await Cart.deleteOne({ user: req.user._id }).session(session);

    await session.commitTransaction();
    session.endSession();

    /* =========================
       Populate for response + email
    ========================= */
    const order = await Order.findById(orderDocs[0]._id)
      .populate("orderDetails.product")
      .populate("user");

    const orderObj = order.toObject();

    orderObj.orderDetails = orderObj.orderDetails.map((item) => {
      if (item.product) {
        item.product.featureImage = makeAbsoluteUrl(item.product.featureImage);
        item.product.images = Array.isArray(item.product.images)
          ? item.product.images.map(makeAbsoluteUrl)
          : [];
      }
      return item;
    });

    /* =========================
       Order Confirmation Email
    ========================= */
    if (orderObj.user?.email) {
      const itemsHtml = orderObj.orderDetails
        .map(
          (item) => `
          <tr>
            <td>${item.product.genericName}</td>
            <td>${item.quantity}</td>
            <td>₹${Number(item.price)}</td>
          </tr>
        `,
        )
        .join("");

      const orderLink = `${process.env.FRONTEND_URL}/order/${orderObj._id}`;

      const emailHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Thank you for your order, ${orderObj.user.fullName} 🎉</h2>
        <p>Your order has been placed successfully.</p>
        <p><b>Order Id:</b><a href="${orderLink}"> ${orderObj._id}</a></p>

        <h3>Order Summary</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p style="font-size: 18px;"><strong>Total:</strong> ₹${Number(orderObj.totalPrice)}</p>
        <p><strong>Payment Mode:</strong> Cash on Delivery</p>

        <h3>Shipping Address</h3>
        <p>
          ${orderObj.shippingAddress.landmark},<br/>
          ${orderObj.shippingAddress.city}, ${orderObj.shippingAddress.state} - 
          ${orderObj.shippingAddress.zipCode}
        </p>

        <p>We will notify you once your order is shipped 🚚</p>

        <p>Regards,<br/><strong>Your Store Team</strong></p>
      </div>
    `;

      // Non-blocking email
      sendEmail(orderObj.user.email, "Order Confirmation", emailHtml).catch(
        (err) => console.error("Order email failed:", err),
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(201, orderObj, "Order placed successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

/* =========================
   GET USER ORDERS
========================= */
export const getMyOrders = asyncHandler(async (req, res) => {
  const orderDocs = await Order.find({ user: req.user._id })
    .populate({
      path: "orderDetails.product",
      select: "genericName subGenericName coursDuration featureImage",
    })
    .sort({ createdAt: -1 });

  const orders = orderDocs.map((orderDoc) => {
    const order = orderDoc.toObject();

    order.orderDetails = order.orderDetails.map((item) => {
      if (item.product?.featureImage) {
        item.product.featureImage = makeAbsoluteUrl(item.product.featureImage);
      }
      return item;
    });

    return order;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Orders fetched successfully"));
});

/* =========================
   GET ORDER BY ID
========================= */
export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const orderDoc = await Order.findOne({
    _id: orderId,
    user: req.user._id,
  }).populate({
    path: "orderDetails.product",
    select: `
      -shortDescription
      -fullDescription
      -descriptionForRecommendation
      -mrp
      -sellPrice
      -stock
      -isOutOfStock
    `,
  });

  if (!orderDoc) {
    throw new ApiError(404, "Order not found");
  }

  const order = orderDoc.toObject();

  /* -------- Normalize product images -------- */
  order.orderDetails = order.orderDetails.map((item) => {
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
    .json(new ApiResponse(200, order, "Order fetched successfully"));
});

/* =========================
   ADMIN: GET ALL ORDERS
========================= */
export const getAllOrders = asyncHandler(async (req, res) => {
  //  Query params
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  //  Total Orders
  const totalOrders = await Order.countDocuments();

  const orderDocs = await Order.find()
    .populate("user")
    .populate({
      path: "orderDetails.product",
      select: "genericName subGenericName coursDuration featureImage",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Pagination meta
  const pagination = {
    total: totalOrders,
    page,
    limit,
    totalPages: Math.ceil(totalOrders / limit),
    hasNextPage: page * limit < totalOrders,
    hasPrevPage: page > 1,
  };

  const orders = orderDocs.map((orderDoc) => {
    const order = orderDoc.toObject();

    order.orderDetails = order.orderDetails.map((item) => {
      if (item.product) {
        item.product.featureImage = makeAbsoluteUrl(item.product.featureImage);
      }
      return item;
    });

    return order;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {
      orders,
      pagination,
    }, "All orders fetched"));
});

/* =========================
   ADMIN: UPDATE DELIVERY STATE
========================= */
export const updateDeliveryState = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { deliveryState } = req.body;

  const validStates = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!validStates.includes(deliveryState)) {
    throw new ApiError(400, "Invalid delivery state");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  order.deliveryState = deliveryState;
  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated"));
});
