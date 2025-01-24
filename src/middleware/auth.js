import jwt from "jsonwebtoken";
import User from "../models/user.js";


export const jwtParse = async (
  req,
  res,
  next
) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.sendStatus(401);
  }

  // Bearer lshdflshdjkhvjkshdjkvh34h5k3h54jkh
  const token = authorization.split(" ")[1];

  try {
    const decoded = jwt.decode(token)
    const id = decoded.id;
    

    const user = await User.findOne({ _id: id });

    if (!user) {
      return res.sendStatus(401);
    }

    req.email = user.email
    req.userId = user._id.toString();
    next();
  } catch (error) {
    return res.sendStatus(401);
  }
};
