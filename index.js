import "dotenv/config";
import connectDB from "./db/index.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/", (req, res) =>
  res.status(200).json({ message: "Welcome to Nutriient Backend" }),
);

// routes import
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";
import categoryRouter from "./routes/category.routes.js";
import productRouter from "./routes/product.routes.js";
import cartRouter from "./routes/cart.routes.js";
import orderRouter from "./routes/order.routes.js";
import quizRouter from "./routes/quiz.routes.js";
import chartRouter from "./routes/chart.routes.js";

import contactRouter from "./routes/contact.routes.js";

// routes declaration
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/category", categoryRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/chart", chartRouter);

app.use("/api/contact", contactRouter);

// http://localhost:4000/api/users/register

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT}.`);
    });
  })
  .catch((err) => {
    console.log("MongoDB Connection Failed: ", err);
  });
