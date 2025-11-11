import asyncHandler from "express-async-handler";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { clerkClient, getAuth } from "@clerk/express";

const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req); //clerkId
  const user = await User.findOneAndUpdate({ clerkId: userId }, req.body, {
    new: true,
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ user });
});

const syncUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);

  //check if the user already exists in the mongoDB database
  const existingUser = await User.findOne({ clerkId: userId });
  if (existingUser) {
    return res
      .status(200)
      .json({ user: existingUser, message: "User already exists" });
  }

  //if not, create a new user from clerk data
  const clerkUser = await clerkClient.users.getUser(userId);

  const userData = {
    clerkId: userId,
    email: clerkUser.emailAddresses[0].emailAddress,
    firstName: clerkUser.firstName || "",
    lastName: clerkUser.lastName || "",
    username: clerkUser.emailAddresses[0].emailAddress.split("@")[0],
    profilePicture: clerkUser.imageUrl || "",
  };

  const user = await User.create(userData);

  return res.status(200).json({ user, message: "User created successfully" });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);

  const user = await User.findOne({ clerkId: userId });
  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json({ user });
});

const followUser = asyncHandler(async (req, res) => {
  //ge the userid of the current user from clerk
  const { userId } = getAuth(req);

  //get the id of the targeted user from the params
  const { targetedUserId } = req.params;

  if (userId === targetedUserId)
    return res.status(400).json({ message: "You cannot follow yourself" });

  const currentUser = await User.findOne({ clerkId: userId });
  const targetUser = await User.findById(targetedUserId);

  if (!currentUser || !targetUser)
    return res.status(404).json({ message: "User not found" });

  //check if already following
  const isFollowing = currentUser.following.includes(targetedUserId);

  if (isFollowing) {
    // if already following, unfollow
    await User.findByIdAndUpdate(currentUser._id, {
      $pull: { following: targetedUserId },
    });
    await User.findByIdAndUpdate(targetedUserId, {
      $pull: { followers: currentUser._id },
    });
  } else {
    //if not following, follow
    await User.findByIdAndUpdate(currentUser._id, {
      $push: { following: targetedUserId },
    });
    await User.findByIdAndUpdate(targetedUserId, {
      $push: { followers: currentUser._id },
    });

    //if a user follows another user, push a notification
    await Notification.create({
      from: currentUser._id,
      to: targetedUserId,
      type: "follow",
    });
  }

  res.status(200).json({
    message: isFollowing
      ? "User unfollowed successfully"
      : "User followed successfully",
  });
});

export { getUserProfile, updateProfile, syncUser, getCurrentUser, followUser };
