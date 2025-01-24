import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import myUserRoute from "./routes/MyUserRoute.js";
import myRestaurantRoute from "./routes/MyRestaurantRoute.js";
import orderRoute from "./routes/OrderRoute.js";
import menuItemRoute from "./routes/MenuItemRoute.js";

mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING)
  .then(() => console.log("Connected to database!"));


const app = express();

app.use(cors());

app.use(express.json());


app.get("/health", async (req, res) => {
    res.send({ message: "health OK!" });
});

app.use("/api/my/user", myUserRoute);
app.use("/api/my/restaurant", myRestaurantRoute);
app.use("/api/menuItem", menuItemRoute);
app.use("/api/order", orderRoute);


app.listen(7000, () => {
    console.log("server started on localhost:7000");
});