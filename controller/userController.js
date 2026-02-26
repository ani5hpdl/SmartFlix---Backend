const bcrypt = require("bcrypt");
const User = require("../models/UserModel");
const Review = require("../models/ReviewModel");
const Movie = require("../models/MovieModel");


// ============================
// CREATE USER
// ============================
const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "All Fields are Required",
    });
  }

  try {
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "Email Already in Use!",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: true,
      role,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "User Created Successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User Creation Failed!",
      error: error.message,
    });
  }
};


// ============================
// UPDATE USER
// ============================
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, role, isActive, isEmailVerified, lockUntil } = req.body;

  try {
    const userExists = await User.findByPk(id);

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User Not Found!",
      });
    }

    await userExists.update({
      name: name ?? userExists.name,
      role: role ?? userExists.role,
      isActive: isActive ?? userExists.isActive,
      isEmailVerified: isEmailVerified ?? userExists.isEmailVerified,
      lockUntil: lockUntil ?? userExists.lockUntil,
    });

    return res.status(200).json({
      success: true,
      message: "User Updated Successfully!",
      data: userExists,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User Update Failed!",
      error: error.message,
    });
  }
};


// ============================
// GET ALL USERS (With Reviews)
// ============================
const getAllUser = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "name",
        "email",
        "role",
        "isActive",
        "isEmailVerified",
        "lockUntil",
      ],
      include: [
        {
          model: Review,
          as: "reviews",
          attributes: ["id", "rating", "review_text", "movie_id"],
          include: [
            {
              model: Movie,
              as: "movie",
              attributes: ["id", "title"],
            },
          ],
        },
      ],
    });

    // Unlock expired accounts automatically
    for (const user of users) {
      if (user.lockUntil && user.lockUntil < new Date()) {
        user.lockUntil = null;
        user.isActive = true;
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};


// ============================
// GET USER BY ID (With Reviews)
// ============================
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const fetchUser = await User.findByPk(id, {
      attributes: [
        "id",
        "name",
        "email",
        "role",
        "isActive",
        "isEmailVerified",
        "lockUntil",
      ],
      include: [
        {
          model: Review,
          as: "reviews",
          attributes: ["id", "rating", "review_text", "is_spoiler"],
          include: [
            {
              model: Movie,
              as: "movie",
              attributes: ["id", "title", "imageUrl"],
            },
          ],
        },
      ],
    });

    if (!fetchUser) {
      return res.status(404).json({
        success: false,
        message: "No User Found!",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User Fetched Successfully",
      data: fetchUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while Fetching Data!",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  getAllUser,
  getUserById,
  updateUser,
};