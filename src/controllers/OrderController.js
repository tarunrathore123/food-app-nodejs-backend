import Stripe from "stripe";
import Restaurant from "../models/restaurant.js";
import Order from "../models/order.js";
import User from "../models/user.js";

const STRIPE = new Stripe(process.env.STRIPE_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const createOrder = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const restaurant = await Restaurant.findById(req.body.restaurant).populate(
      "menuItems"
    );
    const cartItems = req.body.cartItems;
    let totalAmount = 0;

    const menuItemsMap = {};
    for (const menuItem of restaurant.menuItems) {
      menuItemsMap[menuItem._id] = menuItem;
    }

    for (const cartItem of cartItems) {
      const menuItem = menuItemsMap[cartItem._id];
      if (!menuItem) {
        return res.status(400).json({ message: "Menu item not found" });
      }
      totalAmount += menuItem.price * cartItem.quantity;
    }

    const newOrder = new Order({
      user: user,
      restaurant: restaurant,
      cartItems: cartItems,
      totalAmount: totalAmount,
      createdAt: new Date(),
    });
    const order = await newOrder.save();

    res.json({ message: "Order created successfully", order });
    // res.json(totalAmount);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

async function getOrdersWithDetails(req, res) {
  try {
    const orders = await Order.aggregate([
      {
        $lookup: {
          from: "restaurants",
          localField: "restaurant",
          foreignField: "_id",
          as: "restaurantDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$restaurantDetails",
      },
      {
        $unwind: "$userDetails",
      },
      //   {
      //     $group: {
      //       _id: "$_id",
      //       restaurant: { $first: "$restaurantDetails.restaurantName" },
      //       user: { $first: "$userDetails.name" },
      //       cartItems: {
      //         $push: {
      //           // menuItem: "$menuItemDetails",
      //           name: "$cartItems.name",
      //           quantity: "$cartItems.quantity",
      //         },
      //       },
      //       totalAmount: { $first: "$totalAmount" },
      //       createdAt: { $first: "$createdAt" },
      //     },
      //   },
    ]);
    res.json({ orders });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
}

async function getTopSellingMenuItems(req, res) {
  const topItems = await Order.aggregate([
    { $unwind: "$cartItems" },
    // {
    //   $group: {
    //     _id: "$cartItems._id",
    //     totalQuantity: { $sum: "$cartItems.quantity" },
    //   },
    // },
    // {
    //   $lookup: {
    //     from: "restaurants",
    //     localField: "_id",
    //     foreignField: "menuItems._id",
    //     as: "menuItemDetails",
    //   },
    // },
    // {
    //   $unwind: "$menuItemDetails",
    // },
    // {
    //   $project: {
    //     menuItemName: "$menuItemDetails.menuItems.name",
    //     totalQuantity: 1,
    //   },
    // },
    { $sort: { totalQuantity: -1 } },
    { $limit: 5 },
  ]);
  res.json(topItems);
}

async function filterOrders(req, res) {
  let orders = await Restaurant.aggregate([
    {
      $lookup: {
        from: "menuitems",
        localField: "menuItems",
        foreignField: "_id",
        as: "menuitemsDetails",
      },
    },
  ]);

  res.json(orders);
}

async function getRevenueByRestaurant(req, res) {
  let restaurant = await Order.aggregate([
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurant",
        foreignField: "_id",
        as: "restaurant",
      },
    },
    {
      $unwind: "$restaurant",
    },
    {
      $group: {
        _id: "$restaurant.restaurantName",
        revenue: { $sum: "$totalAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        restaurant: "$_id",
        revenue: 1,
      },
    },
    {
      $lookup: {
        from: "restaurants",
        localField: "restaurant",
        foreignField: "restaurantName",
        as: "restaurantDetails",
      },
    },
  ]);

  res.json(restaurant);
}

async function searchRestaurantsByCuisine(req, res) {
  // let restaurant = await Restaurant.find({cuisines: req.query.cuisine}).lean()
  let restaurant = await Restaurant.find({
    cuisines: {$regex: req.query.cuisine, $options: "i"},
  }).lean();

  res.json(restaurant);
}

const stripeWebhookHandler = async (req, res) => {
  let event;

  try {
    const sig = req.headers["stripe-signature"];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_ENDPOINT_SECRET
    );
  } catch (error) {
    console.log(error);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const order = await Order.findById(event.data.object.metadata?.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.totalAmount = event.data.object.amount_total;
    order.status = "paid";

    await order.save();
  }

  res.status(200).send();
};

const createCheckoutSession = async (req, res) => {
  try {
    const checkoutSessionRequest = req.body;

    const restaurant = await Restaurant.findById(
      checkoutSessionRequest.restaurantId
    );

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const newOrder = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: "placed",
      deliveryDetails: checkoutSessionRequest.deliveryDetails,
      cartItems: checkoutSessionRequest.cartItems,
      createdAt: new Date(),
    });

    const lineItems = createLineItems(
      checkoutSessionRequest,
      restaurant.menuItems
    );

    const session = await createSession(
      lineItems,
      newOrder._id.toString(),
      restaurant.deliveryPrice,
      restaurant._id.toString()
    );

    if (!session.url) {
      return res.status(500).json({ message: "Error creating stripe session" });
    }

    await newOrder.save();
    res.json({ url: session.url });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.raw.message });
  }
};

const createLineItems = (checkoutSessionRequest, menuItems) => {
  const lineItems = checkoutSessionRequest.cartItems.map((cartItem) => {
    const menuItem = menuItems.find(
      (item) => item._id.toString() === cartItem.menuItemId.toString()
    );

    if (!menuItem) {
      throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
    }

    const line_item = {
      price_data: {
        currency: "gbp",
        unit_amount: menuItem.price,
        product_data: {
          name: menuItem.name,
        },
      },
      quantity: parseInt(cartItem.quantity),
    };

    return line_item;
  });

  return lineItems;
};

const createSession = async (
  lineItems,
  orderId,
  deliveryPrice,
  restaurantId
) => {
  const sessionData = await STRIPE.checkout.sessions.create({
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery",
          type: "fixed_amount",
          fixed_amount: {
            amount: deliveryPrice,
            currency: "gbp",
          },
        },
      },
    ],
    mode: "payment",
    metadata: {
      orderId,
      restaurantId,
    },
    success_url: `${FRONTEND_URL}/order-status?success=true`,
    cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
  });

  return sessionData;
};

export default {
  getMyOrders,
  createOrder,
  getOrdersWithDetails,
  getTopSellingMenuItems,
  filterOrders,
  getRevenueByRestaurant,
  searchRestaurantsByCuisine,
  createCheckoutSession,
  stripeWebhookHandler,
};
