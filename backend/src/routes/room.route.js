import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getRooms, joinRoom, findOrCreateRoom } from "../controllers/room.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getRooms);
router.post("/join/:roomId", joinRoom);
router.post("/find-or-create", findOrCreateRoom);

export default router;
