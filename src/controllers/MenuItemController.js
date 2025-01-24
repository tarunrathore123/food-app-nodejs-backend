import MenuItem from "../models/menuItem.js";
import Restaurant from "../models/restaurant.js";

const createMenuItem = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.body.restaurant);
    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }
    let menuItem = new MenuItem({
        name: req.body.name,
        price: req.body.price,
    })
    menuItem = await menuItem.save();

    restaurant.menuItems.push(menuItem);

    await restaurant.save();

    res.json(restaurant);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching restaurant" });
  }
};


export default {
    createMenuItem,
};
