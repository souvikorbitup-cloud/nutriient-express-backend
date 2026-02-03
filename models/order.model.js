import { Schema, model } from "mongoose";

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderDetails: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Schema.Types.Decimal128,
          required: true,
        },
      },
    ],

    totalPrice: {
      type: Schema.Types.Decimal128,
    },

    dateOfPurchase: {
      type: Date,
      default: Date.now,
    },

    orderSource: {
      type: String,
      enum: ["QUIZ", "GENERAL"],
      required: true,
    },

    deliveryState: {
      type: String,
      enum: ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },

    paymentMode: {
      type: String,
      enum: ["COD", "CARD", "UPI", "NET_BANKING", "WALLET"],
      required: true,
    },

    shippingAddress: {
      landmark: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
    },
  },
  { timestamps: true },
);

orderSchema.pre("save", function () {
  this.totalPrice = this.orderDetails.reduce(
    (sum, item) => sum + parseFloat(item.price.toString()) * item.quantity,
    0,
  );
});

export const Order = model("Order", orderSchema);
