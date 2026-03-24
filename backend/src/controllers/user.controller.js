import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import cloudinary from "../lib/cloudinary.js";
import { upsertStreamUser } from "../lib/stream.js";

export async function getRecommendedUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    const currentUser = req.user;

    const recommendedUsers = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, //exclude current user
        { _id: { $nin: currentUser.friends } }, // exclude current user's friends
        { isOnboarded: true },
      ],
    });
    res.status(200).json(recommendedUsers);
  } catch (error) {
    console.error("Error in getRecommendedUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select("friends")
      .populate("friends", "fullName profilePic profilePicture nativeLanguage learningLanguage");

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const { id: recipientId } = req.params;

    // prevent sending req to yourself
    if (myId === recipientId) {
      return res.status(400).json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // check if user is already friends
    if (recipient.friends.includes(myId)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // check if a req already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A friend request already exists between you and this user" });
    }

    const friendRequest = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Verify the current user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to accept this request" });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    // add each user to the other's friends array
    // $addToSet: adds elements to an array only if they do not already exist.
    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log("Error in acceptFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const incomingReqs = await FriendRequest.find({
      recipient: req.user.id,
      status: "pending",
    }).populate("sender", "fullName profilePic profilePicture nativeLanguage learningLanguage");

    const acceptedReqs = await FriendRequest.find({
      sender: req.user.id,
      status: "accepted",
    }).populate("recipient", "fullName profilePic profilePicture");

    res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    console.log("Error in getPendingFriendRequests controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const outgoingRequests = await FriendRequest.find({
      sender: req.user.id,
      status: "pending",
    }).populate("recipient", "fullName profilePic profilePicture nativeLanguage learningLanguage");

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the old image from Cloudinary if one exists
    if (user.profilePicturePublicId) {
      try {
        await cloudinary.uploader.destroy(user.profilePicturePublicId);
      } catch (deleteError) {
        console.log("Error deleting old avatar from Cloudinary:", deleteError.message);
      }
    }

    // req.file.path = Cloudinary URL, req.file.filename = Cloudinary public_id
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profilePicture: req.file.path,
        profilePicturePublicId: req.file.filename,
      },
      { new: true }
    ).select("-password");

    // Sync the new avatar to Stream Chat
    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePicture || updatedUser.profilePic || "",
      });
    } catch (streamError) {
      console.log("Error syncing avatar to Stream:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error in uploadAvatar controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();

    const user = await User.findById(userId)
      .select("-password -profilePicturePublicId")
      .populate("friends", "fullName profilePic profilePicture nativeLanguage learningLanguage");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compute mutual friends: users who are in BOTH the profile user's and the requesting user's friends lists
    const currentUser = await User.findById(currentUserId).select("friends");

    const profileFriendIds = new Set(user.friends.map((f) => f._id.toString()));
    const mutualFriendIds = currentUser.friends
      .map((id) => id.toString())
      .filter((id) => profileFriendIds.has(id));

    const mutualFriends = await User.find({ _id: { $in: mutualFriendIds } }).select(
      "fullName profilePic profilePicture nativeLanguage learningLanguage"
    );

    res.status(200).json({
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        profilePicture: user.profilePicture,
        nativeLanguage: user.nativeLanguage,
        learningLanguage: user.learningLanguage,
        bio: user.bio,
        location: user.location,
        country: user.country,
        createdAt: user.createdAt,
        isOnboarded: user.isOnboarded,
        friendCount: user.friends.length,
      },
      mutualFriends,
    });
  } catch (error) {
    console.error("Error in getUserProfile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.user._id;
    const { bio, country } = req.body;

    // Validate bio length
    if (bio !== undefined && bio.length > 200) {
      return res.status(400).json({ message: "Bio must be 200 characters or less" });
    }

    // Build update object — only include fields that were provided
    const updateFields = {};
    if (bio !== undefined) updateFields.bio = bio;
    if (country !== undefined) updateFields.country = country;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true }).select(
      "-password -profilePicturePublicId"
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error in updateProfile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function searchUsers(req, res) {
  try {
    const currentUserId = req.user._id;
    const { name, nativeLanguage, learningLanguage, country } = req.query;

    // If no query params provided, return empty array
    if (!name && !nativeLanguage && !learningLanguage && !country) {
      return res.status(200).json([]);
    }

    const filter = {
      _id: { $ne: currentUserId },
      isOnboarded: true,
    };

    if (name) {
      filter.fullName = { $regex: name, $options: "i" };
    }
    if (nativeLanguage) {
      filter.nativeLanguage = { $regex: `^${nativeLanguage}$`, $options: "i" };
    }
    if (learningLanguage) {
      filter.learningLanguage = { $regex: `^${learningLanguage}$`, $options: "i" };
    }
    if (country) {
      filter.$or = [
        { country: { $regex: country, $options: "i" } },
        { location: { $regex: country, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password -profilePicturePublicId")
      .limit(20);

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
