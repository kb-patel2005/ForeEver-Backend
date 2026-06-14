const Chat = require("../model/chat");
const Conversation = require("../model/conversation");

const addChat = async (roomId, message, senderId, receiverId) => {

    try {
        const newChat = await Chat.create({ message, senderId, receiverId });
        let conversation = await Conversation.findOne({ roomId });
        if (!conversation) {
            conversation = await Conversation.create({ roomId });
        }
        conversation.messages.push(newChat._id);
        await conversation.save();
        return newChat
    } catch (error) {
        return new error("internal server error")
    }
}

module.exports = {addChat}