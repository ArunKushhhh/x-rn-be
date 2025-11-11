import asyncHandler from "express-async-handler";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { Comment } from "../models/comment.model.js";
import { getAuth } from "@clerk/express";
import cloudinary from "../config/cloudinary.js";

const getPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  res.status(200).json({ posts });
});

const getPost = asyncHandler(async (req, res) => {
  const postId = req.params;

  const post = await Post.findById(postId)
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  if (!post) return res.status(404).json({ message: "Post not found" });

  res.status(200).json({ post });
});

const getUserPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: "User not found" });

  const posts = await Post.find({ user: user._id })
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture")
    .populate({
      path: "comments",
      populate: {
        path: "user",
        select: "username firstName lastName profilePicture",
      },
    });

  if (!posts) return res.status(404).json({ message: "Posts not found" });

  res.status(200).json({ posts });
});

const createPost = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { content } = req.body;
  const imageFile = req.file;
  if (!content && !imageFile) {
    return res
      .status(404)
      .json({ message: "Post must contain either text or image" });
  }

  const user = User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ message: "User not found" });

  let imageUrl = "";
  if (imageFile) {
    try {
      // convert buffer to base64 for cloudinary
      const base64Image = `data:${
        imageFile.mimetype
      };base64,${imageFile.buffer.toString("base64")}`;

      const uploadResponse = await cloudinary.uploader.upload(base64Image, {
        folder: "social_media_posts",
        resource_type: "image",
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto" },
          { format: "auto" },
        ],
      });

      imageUrl = uploadResponse.secure_url;
    } catch (uploadError) {
      console.error("Cloudinary upload error: ", uploadError);
      return res.status(400).json({ message: "Failed to upload image" });
    }
  }

  const post = await Post.create({
    user: user._id,
    content: content || "",
    image: imageUrl,
  });

  res.status(201).json({ post });
});

const likePost = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { postId } = req.params;

  const user = await User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ message: "User not found" });

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const isLiked = post.likes.includes(user._id);

  if (isLiked) {
    // unlike
    await Post.findByIdAndUpdate(postId, {
      $pull: { likes: user._id },
    });
  } else {
    // like
    await Post.findByIdAndUpdate(postId, {
      $push: { likes: user._id },
    });

    //create notification only when liked
    if (!post.user.toString() !== user._id.toString()) {
      await Notification.create({
        from: user._id,
        to: post.user,
        type: "like",
        post: postId,
      });
    }
  }

  res.status(200).json({
    message: isLiked ? "Post unliked successfully" : "Post liked successfully",
  });
});

const deletePost = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { postId } = req.params;

  const user = await User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ message: "User not found" });

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ message: "Post not found" });

  if (post.user.toString() !== user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You can only delete your own posts." });
  }

  // delete all comments related to that post
  await Comment.deleteMany({ post: postId });

  // delete the post
  await Post.findByIdAndDelete(postId);

  res.status(200).json({ message: "Post deleted successfully" });
});

export { getPosts, getPost, getUserPosts, createPost, likePost, deletePost };
