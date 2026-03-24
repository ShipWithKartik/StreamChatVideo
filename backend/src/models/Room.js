import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    languageOne: {
      type: String,
      required: true,
    },
    languageTwo: {
      type: String,
      required: true,
    },
    streamChannelId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;
