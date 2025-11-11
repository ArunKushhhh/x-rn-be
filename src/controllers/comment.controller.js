import asyncHandler from "express-async-handler";
import { getAuth } from "@clerk/express";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";

const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: -1 })
    .populate("user", "username firstName lastName profilePicture");

  res.status(200).json({ comments });
});

const createComment = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { postId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    return res.status(400).json({ message: "Comment content is required" });
  }

  const user = await User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ message: "User not found" });

  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const comment = await Comment.create({
    user: user._id,
    post: postId,
    content,
  });

  //link the comment with the post using the post id
  await Post.findByIdAndUpdate(postId, {
    $push: { comments: comment._id },
  });

  if (post.user.toString() !== user._id.toString()) {
    await Notification.create({
      from: user._id,
      to: post.user,
      type: "comment",
      post: postId,
      comment: comment._id,
    });
  }

  res.status(201).json({ comment });
});

const deleteComment = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const { commentId } = req.params;

  const user = await User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ message: "User not found" });

  const comment = await Comment.findById(commentId);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  if (comment.user.toString() !== user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You can only delete your own comments" });
  }

  //remove comment from post
  await Post.findByIdAndUpdate(comment.post, {
    $pull: { comments: commentId },
  });

  //delete comment
  await Comment.findByIdAndDelete(commentId);

  res.status(200).json({ message: "Comment deleted successfully" });
});

export { getComments, createComment, deleteComment };
