const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const userRouters = require("./routes/userRoutes.js");
const postRouters = require("./routes/postRoutes.js");
const chatRouters = require("./routes/chatRoutes.js")

const connectDB = require("./config.js");
const { addChat } = require("./controller/chatController.js");

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "https://foreverweb.netlify.app/",   // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: "https://foreverweb.netlify.app/",
    methods: ["GET", "POST"]
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  console.log(token)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    console.log("error here")
    next(new Error("Authentication error"));
  }
});


io.on("connection", (socket) => {

  socket.on("joinRoom", ({ roomId }) => {
    if (roomId) {
      console.log("socket connection created........")
      socket.join(roomId);
    }
  });

  socket.on("roomMessage", ({ roomId, message, senderId, receiverId }) => {
    if (roomId && message) {
      const chat = addChat(roomId, message, senderId, receiverId);
      if (chat) {
        io.to(roomId).emit("roomMessage", { _id: chat._id, senderId, message });
      } else {
        throw new Error("something went wrong...")
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});

app.use(express.json());

connectDB();

app.use("/user", userRouters);
app.use("/post", postRouters);
app.use("/chat", chatRouters);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`App + Socket.IO running successfully on port ${PORT}`);
});
