const admin = require("../config/firebase-config");

class Middleware {
  async decodeToken(req, res, next) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      console.log("req");
      const decodeValue = await admin.auth().verifyIdToken(token);
      if (decodeValue) {
        return next();
      }
      return res.json({ message: "Unauthorized" });
    } catch (e) {
      return res.json({ message: "Internal Error" });
    }
  }
}
module.exports = new Middleware();
