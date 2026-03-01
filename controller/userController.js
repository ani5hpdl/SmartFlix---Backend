const bcrypt = require("bcrypt");
const User = require("../models/UserModel");
const Review = require("../models/ReviewModel");
const Movie = require("../models/MovieModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const ALLOWED_ROLES = new Set(["user", "admin"]);
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();
const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const parsePagination = (query) => {
  const pageNum = Number(query.page);
  const limitNum = Number(query.limit);
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const rawLimit = Number.isInteger(limitNum) && limitNum > 0 ? limitNum : DEFAULT_PAGE_SIZE;
  const limit = Math.min(rawLimit, MAX_PAGE_SIZE);
  return { page, limit, offset: (page - 1) * limit };
};


// ============================
// CREATE USER
// ============================
const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const safeName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = normalizeEmail(email);
  const safeRole = typeof role === "string" ? role.trim().toLowerCase() : "";

  if (!safeName || !normalizedEmail || !password || !safeRole) {
    return res.status(400).json({
      success: false,
      message: "Name, email, password and role are required",
    });
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must be 8+ chars with uppercase, lowercase and number",
    });
  }

  if (!ALLOWED_ROLES.has(safeRole)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role",
    });
  }

  try {
    const userExists = await User.findOne({ where: { email: normalizedEmail } });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await User.create({
      name: safeName,
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: true,
      role: safeRole,
      isActive: true,
      loginAttempts: 0,
      lockUntil: null,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("createUser error:", error);
    return res.status(500).json({
      success: false,
      message: "User creation failed",
    });
  }
};


// ============================
// UPDATE USER
// ============================
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, role, isActive, isEmailVerified, lockUntil } = req.body;
  const targetUserId = parseId(id);

  if (!targetUserId) {
    return res.status(400).json({
      success: false,
      message: "Invalid user id",
    });
  }

  try {
    const userExists = await User.findByPk(targetUserId);

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: "Name must be a non-empty string",
      });
    }

    if (role !== undefined) {
      const requestedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
      if (!ALLOWED_ROLES.has(requestedRole)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean",
      });
    }

    if (isEmailVerified !== undefined && typeof isEmailVerified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isEmailVerified must be boolean",
      });
    }

    let parsedLockUntil = userExists.lockUntil;
    if (lockUntil !== undefined) {
      if (lockUntil === null || lockUntil === "") {
        parsedLockUntil = null;
      } else {
        const lockDate = new Date(lockUntil);
        if (Number.isNaN(lockDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid lockUntil datetime",
          });
        }
        parsedLockUntil = lockDate;
      }
    }

    const currentUserId = req.user?.userId;
    if (currentUserId && Number(currentUserId) === targetUserId) {
      const requestedRole = typeof role === "string" ? role.trim().toLowerCase() : undefined;
      if (requestedRole && requestedRole !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You cannot remove your own admin role",
        });
      }
      if (isActive === false) {
        return res.status(403).json({
          success: false,
          message: "You cannot deactivate your own account",
        });
      }
    }

    await userExists.update({
      name: name !== undefined ? name.trim() : userExists.name,
      role: role !== undefined ? role.trim().toLowerCase() : userExists.role,
      isActive: isActive ?? userExists.isActive,
      isEmailVerified: isEmailVerified ?? userExists.isEmailVerified,
      lockUntil: parsedLockUntil,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: userExists,
    });
  } catch (error) {
    console.error("updateUser error:", error);
    return res.status(500).json({
      success: false,
      message: "User update failed",
    });
  }
};


// ============================
// GET ALL USERS (With Reviews)
// ============================
const getAllUser = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows: users, count } = await User.findAndCountAll({
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
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    // Unlock expired accounts automatically
    const now = new Date();
    const expiredUsers = [];
    for (const user of users) {
      if (user.lockUntil && user.lockUntil < now) {
        user.lockUntil = null;
        user.isActive = true;
        user.loginAttempts = 0;
        expiredUsers.push(user.save());
      }
    }
    if (expiredUsers.length) {
      await Promise.all(expiredUsers);
    }

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("getAllUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
};


// ============================
// GET USER BY ID (With Reviews)
// ============================
const getUserById = async (req, res) => {
  const { id } = req.params;
  const userId = parseId(id);

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Invalid user id",
    });
  }

  try {
    const fetchUser = await User.findByPk(userId, {
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
        message: "No user found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User Fetched Successfully",
      data: fetchUser,
    });
  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({
      success: false,
      message: "Error while fetching data",
    });
  }
};

module.exports = {
  createUser,
  getAllUser,
  getUserById,
  updateUser,
};
