import Room from "../models/Room.js";
import { streamClient } from "../lib/stream.js";

export async function getRooms(req, res) {
  try {
    const rooms = await Room.find().select("name languageOne languageTwo streamChannelId");
    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error in getRooms controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinRoom(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Add user as a member of the Stream channel
    const channel = streamClient.channel("team", room.streamChannelId);
    await channel.addMembers([userId]);

    res.status(200).json({ success: true, room });
  } catch (error) {
    console.error("Error in joinRoom controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export async function findOrCreateRoom(req, res) {
  try {
    const { languageOne, languageTwo } = req.body;
    const userId = req.user._id.toString();

    if (!languageOne || !languageTwo) {
      return res.status(400).json({ message: "Both languages are required" });
    }

    if (languageOne === languageTwo) {
      return res.status(400).json({ message: "Languages must be different" });
    }

    // Normalize: sort alphabetically so "hindi-english" and "english-hindi" map to the same room
    const [langA, langB] = [languageOne.toLowerCase(), languageTwo.toLowerCase()].sort();

    // Check if room already exists
    let room = await Room.findOne({ languageOne: langA, languageTwo: langB });

    if (!room) {
      // Create Stream team channel
      const channelId = `room-${langA}-${langB}`;
      const roomName = `${capitalize(langA)} ↔ ${capitalize(langB)}`;

      // Ensure "system" user exists
      await streamClient.upsertUsers([{ id: "system", name: "System", role: "admin" }]);

      const channel = streamClient.channel("team", channelId, {
        name: roomName,
        created_by_id: "system",
        image: `https://ui-avatars.com/api/?name=${capitalize(langA)}+${capitalize(langB)}&background=random`,
      });
      await channel.create();

      // Save to DB
      room = await Room.create({
        name: roomName,
        languageOne: langA,
        languageTwo: langB,
        streamChannelId: channelId,
      });
    }

    // Add user to the Stream channel
    const channel = streamClient.channel("team", room.streamChannelId);
    await channel.addMembers([userId]);

    res.status(200).json({ success: true, room });
  } catch (error) {
    console.error("Error in findOrCreateRoom controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
