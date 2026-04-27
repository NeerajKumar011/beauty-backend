const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    const authHeader =
      req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        message: "No token",
      });
    }

    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid token",
    });
  }
};