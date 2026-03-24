import { StreamChat } from "stream-chat";
import "dotenv/config";
import Room from "../models/Room.js";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Stream API key or Secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export { streamClient };

export const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

export const generateStreamToken = (userId) => {
  try {
    // ensure userId is a string
    const userIdStr = userId.toString();
    return streamClient.createToken(userIdStr);
  } catch (error) {
    console.error("Error generating Stream token:", error);
  }
};

// Starter rooms only — seeded on first startup so the page isn't empty.
// All other rooms are created on-demand via the find-or-create endpoint.
const STARTER_ROOM_PAIRS = [
  { languageOne: "english", languageTwo: "spanish" },
  { languageOne: "english", languageTwo: "hindi" },
  { languageOne: "english", languageTwo: "french" },
];

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export const seedRooms = async () => {
  try {
    const existingRoomCount = await Room.countDocuments();
    if (existingRoomCount > 0) {
      console.log(`Rooms already seeded (${existingRoomCount} rooms found)`);
      return;
    }

    console.log("Seeding starter language exchange rooms...");

    // Ensure "system" user exists in Stream (required for created_by_id)
    await streamClient.upsertUsers([{ id: "system", name: "System", role: "admin" }]);

    for (const pair of STARTER_ROOM_PAIRS) {
      const channelId = `room-${pair.languageOne}-${pair.languageTwo}`;
      const roomName = `${capitalize(pair.languageOne)} ↔ ${capitalize(pair.languageTwo)}`;

      // Create Stream team channel
      const channel = streamClient.channel("team", channelId, {
        name: roomName,
        created_by_id: "system",
        image: `https://ui-avatars.com/api/?name=${capitalize(pair.languageOne)}+${capitalize(pair.languageTwo)}&background=random`,
      });

      await channel.create();

      // Save room to DB
      await Room.create({
        name: roomName,
        languageOne: pair.languageOne,
        languageTwo: pair.languageTwo,
        streamChannelId: channelId,
      });

      console.log(`  ✓ Created starter room: ${roomName}`);
    }

    console.log("Starter room seeding complete!");
  } catch (error) {
    console.error("Error seeding rooms:", error);
  }
};
