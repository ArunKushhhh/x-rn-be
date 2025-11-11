import express from "express";
import {
  followUser,
  getCurrentUser,
  getUserProfile,
  syncUser,
  updateProfile,
} from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

//to get a user, you don't have to be authenticated
router.get("/profile/:username", getUserProfile);

// Protected Routes
// update profile => auth => update
router.put("/profile", protectRoute, updateProfile);
// to sync the authenticated user with our mongoDB Database
router.post("/sync", protectRoute, syncUser);
//get the current user
router.post("/me", protectRoute, getCurrentUser);
//to follow a user
router.post("/follow/:targetedUserId", protectRoute, followUser);

export default router;
