const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Chat = require("../model/chat");
const Conversation = require("../model/conversation");

const router = express.Router();

router.get("/:roomId", authMiddleware, async (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.user.id;
    try {
        let conversation = await Conversation.findOne({ roomId })
            .populate("messages", "senderId message");
        if (conversation == null) {
            conversation = await Conversation.create({ roomId: roomId })
        } else {
            const userIds = conversation.roomId.split("-")
            if (userIds[0] != userId && userIds[1] != userId) {
                res.status(403).json({ message: "unAuthorize Access..." });
            }
        }
        res.status(200).json(conversation)
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

module.exports = router