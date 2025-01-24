import { generateToken } from "../helpers/tokens.js";
import User from "../models/user.js";

const getCurrentUser = async (req, res) => {
  try {
    const currentUser = await User.findOne({ _id: req.userId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(currentUser);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const createCurrentUser = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(200).send({ message: "Already a user" });
    }

    const newUser = new User(req.body);
    const user = await newUser.save();

    const token = generateToken({ id: user._id.toString() }, "7d");

    res.status(201).json({...newUser.toObject(), token});
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating user" });
  }
};

const updateCurrentUser = async (req, res) => {
  try {
    const { name, addressLine1, country, city } = req.body;
    const user = await User.findOne({email: req.email});

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name;
    user.addressLine1 = addressLine1;
    user.city = city;
    user.country = country;

    await user.save();

    res.send(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating user" });
  }
};

export default {
  getCurrentUser,
  createCurrentUser,
  updateCurrentUser,
};
