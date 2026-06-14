const express = require("express");
const User = require("../model/user")
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../model/post")

router.get("/", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate("followers", "username profilePic")
            .populate("following", "username profilePic");

        if (!user) return res.status(404).json({ message: "User not found" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({ token, user });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "internal server error..." });
    }

})

router.put("/update", authMiddleware, async (req, res) => {
    const userId = req.user.id; 
    const { bio, profilePic } = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                ...(bio && { bio }),
                ...(profilePic && { profilePic }),
            },
            { new: true, runValidators: true } 
        ).select("username email bio profilePic");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const token = jwt.sign({ id: updatedUser._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({
            token,
            user: updatedUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


router.post("/signup", async (req, res) => {
    const { username, password, email, bio, profilePic } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await User.create({
            username,
            email,
            passwordHash: hashedPassword,
            bio,
            profilePic
        });

        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                bio: newUser.bio,
                profilePic: newUser.profilePic
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email })
            .populate("followers", "username profilePic")
            .populate("following", "username profilePic");

        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

        res.json({ token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


router.put("/follow/:id", authMiddleware, async (req, res) => {
    try {
        const userToFollowId = req.params.id;
        const currentUserId = req.user.id;

        if (userToFollowId === currentUserId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { following: userToFollowId }
        });
        const result = await User.findByIdAndUpdate(userToFollowId, {
            $addToSet: { followers: currentUserId }
        });
        console.log(result, result.updatedAt.message)
        if (result.modifiedCount > 0) {
            return res.status(200).json({ message: true });
        } else {
            return res.status(200).json({ message: false });
        }
    } catch (error) {
        res.status(500).json({ message: false });
    }
});

router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const id = req.user.id;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ "message": "User not found" })
        return res.status(200).json(user)
    } catch (error) {
        console.log(error);
        return res.status(500).json({ "message": "internl server error" });
    }
})

router.put("/unfollow/:id", authMiddleware, async (req, res) => {
    try {
        const unfollowId = req.params.id;
        const userId = req.user.id;

        if (unfollowId === userId) {
            return res.status(400).json({ message: "You cannot unfollow yourself" });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: { following: unfollowId }
        });

        await User.findByIdAndUpdate(unfollowId, {
            $pull: { followers: userId }
        });

        res.json({ message: "Unfollowed successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/following", authMiddleware, async (req, res) => {
    try {
        const id = req.user.id;
        const page = parseInt(req.query.page) || 1;   // default page = 1
        const limit = parseInt(req.query.limit) || 10; // default limit = 10
        const skip = (page - 1) * limit;

        const user = await User.findById(id).populate({
            path: "following",
            select: "username email bio profilePic", // only return these fields
            options: { skip, limit }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const totalFollowing = user.following.length;

        res.json({
            totalFollowing,
            currentPage: page,
            totalPages: Math.ceil(totalFollowing / limit),
            following: user.following
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/user/:id", async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId)
            .select("username email bio profilePic followers following")
            .populate("followers", "_id username profilePic")
            .populate("following", "_id username profilePic");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const posts = await Post.find({ userId })
            .select("content image createdAt likes comments")
            .sort({ createdAt: -1 });

        res.json({
            username: user.username,
            email: user.email,
            bio: user.bio,
            profilePic: user.profilePic,
            followers: user.followers,
            following: user.following,
            posts,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router