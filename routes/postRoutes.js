const express = require("express");
const Post = require("../model/post");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;   // current page
        const limit = parseInt(req.query.limit) || 10; // items per page

        const skip = (page - 1) * limit;

        const listOfPost = await Post.find()
            .sort({ createdAt: -1 }) // newest first
            .skip(skip)
            .limit(limit)
            .populate("userId", "username profilePic")
            .populate("likes", "username profilePic")
            .populate("comments.userId", "username profilePic");

        const totalPosts = await Post.countDocuments();
        res.json({
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
            currentPage: page,
            posts: listOfPost
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/userPost", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const posts = await Post.find({ userId })
            .populate("userId", "username profilePic") // populate post owner
            .populate("comments.userId", "username profilePic"); // populate each comment's user

        return res.status(200).json(posts);
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: "Failed to fetch posts" });
    }
});

router.get("/user/:id", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;   // current page
        const limit = parseInt(req.query.limit) || 10; // items per page

        const skip = (page - 1) * limit;
        const userId = req.params.id

        const listOfPost = await Post.find({ userId })
            .sort({ createdAt: -1 }) // newest first
            .skip(skip)
            .limit(limit)
            .populate("userId", "username profilePic")
            .populate("likes", "username profilePic")
            .populate("comments.userId", "username profilePic");

        const totalPosts = await Post.countDocuments();
        res.json({
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
            currentPage: page,
            posts: listOfPost
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
})

router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        return res.json(post);
    } catch (error) {
        console.log(error);
        return null;
    }
})

router.post("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { content, image } = req.body;
        const newPost = await Post.create({ userId, content, image });
        return res.status(201).json(newPost);
    } catch (error) {
        console.log(error);
        return null;
    }
})

router.put("/like/:id", authMiddleware, async (req, res) => {
    const postId = req.params.id;
    const id = req.user.id;
    try {
        const updatedPost = await Post.findByIdAndUpdate(postId, {
            $addToSet: { likes: id }
        })
        return res.json(updatedPost.likes);
    } catch (error) {
        return null;
    }

})

router.post("/unlike", authMiddleware, async (req, res) => {
    const id = req.user.id;
    try {
        const updatedPost = await Post.findByIdAndUpdate(id, {
            $pull: { likes: id }
        });
        return res.json(updatedPost);
    } catch (error) {
        return null
    }
})

router.post("/comment/:id", authMiddleware, async (req, res) => {
    const { message } = req.body;
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        const updatedPost = await Post.findByIdAndUpdate(postId, {
            $push: { comments: { userId, text: message } }
        })
        return updatedPost;
    } catch (error) {
        return null;
    }

})

router.delete("/delete/:id", authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (post.userId.toString() !== userId) {
            return res.status(403).json({ message: "Unauthorized activity" });
        }
        await Post.findByIdAndRemove(req.params.id);
        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router