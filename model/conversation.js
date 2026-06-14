const mongoose = require("mongoose")

const conversation = new mongoose.Schema({
    roomId:{
        type:String,
        required:true,
        unique:true
    },
    messages: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    }
]
},{
    timestamps: true
})

const Conversation = mongoose.model("Conversation",conversation)

module.exports = Conversation