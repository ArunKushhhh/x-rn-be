import express from "express";
import {
  createPost,
  deletePost,
  getPost,
  getPosts,
  getUserPosts,
  likePost,
} from "../controllers/post.controller.js";
import { protectRoute } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

//public routes
router.get("/", getPosts);
router.get("/:postId", getPost);
router.get("/user/:username", getUserPosts);

//protected Routes
//for creating/editing/deleting posts, user needs to be authenticated
// to be able to upload files, we need a multer middleware
// we'll also use cloudinary for storing the image as strings that we can directly get to see those images
router.post("/", protectRoute, upload.single("image"), createPost);
router.post("/:postId/like", protectRoute, likePost);
router.delete("/:postId", protectRoute, deletePost);

export default router;
