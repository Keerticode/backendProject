import { Router } from "express"
import { registerUser } from "../controllers/user.controllers.js";

const router = Router();

router.route("/register").post(registerUser)

export default router;

/*
import { Router } from "express";

const router = Router();

router.post("/register", (req, res) => {
  console.log("REGISTER HIT");
  res.send("WORKING ✅");
});

export default router;
*/