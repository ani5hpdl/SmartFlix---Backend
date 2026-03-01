const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { verificationEmailTemplate, sendEmail } = require("../helpers/sendEmail");
const generateToken = require("../helpers/generateToken");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const LOCK_MINUTES = Number(process.env.ACCOUNT_LOCK_MINUTES || 15);
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
const DUMMY_HASH = "$2b$12$4srrhTQf2S3TN6xif7e0re4thkB9PAQ9Y96s41UT/KxVq1g6m0fH2";

const normalizeEmail = (value = "") => value.trim().toLowerCase();
const secureCookieOptions = (rememberMe) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
});

const registerUser = async (req, res) => {
    const { name, email, password, agreeToTerms } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const safeName = typeof name === "string" ? name.trim() : "";

    if (!safeName || !normalizedEmail || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, email and password are required",
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

    if (!agreeToTerms) {
        return res.status(400).json({
            success: false,
            message: "Please agree to terms and conditions",
        });
    }

    try {
        const userExists = await User.findOne({ where: { email: normalizedEmail } });
        if (userExists) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationExpiresIn = new Date(Date.now() + 60 * 60 * 1000);
        const verificationLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
        const html = verificationEmailTemplate(safeName, verificationLink);
        const isEmailSent = await sendEmail(normalizedEmail, "Verification Email", html);

        if (!isEmailSent) {
            return res.status(500).json({
                success: false,
                message: "Could not send verification email, please try again",
            });
        }

        await User.create({
            name: safeName,
            email: normalizedEmail,
            password: hashedPassword,
            verificationToken,
            verificationExpiresIn,
            isEmailVerified: false,
            role: "user",
            isActive: true,
        });

        return res.status(201).json({
            success: true,
            message: "User created. Please verify your email",
        });
    } catch (error) {
        console.error("registerUser error:", error);
        return res.status(500).json({
            success: false,
            message: "User registration failed",
        });
    }
};

const login = async (req, res) => {
    const { email, password, rememberMe } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required",
        });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format",
        });
    }

    try {
        const fetchUser = await User.findOne({ where: { email: normalizedEmail } });

        if (!fetchUser) {
            await bcrypt.compare(password, DUMMY_HASH);
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (fetchUser.lockUntil && new Date(fetchUser.lockUntil) > new Date()) {
            return res.status(423).json({
                success: false,
                message: "Account temporarily locked. Try again later",
            });
        }

        const isValidUser = await bcrypt.compare(password, fetchUser.password);

        if (!isValidUser) {
            const nextAttempts = Number(fetchUser.loginAttempts || 0) + 1;
            const shouldLock = nextAttempts >= MAX_LOGIN_ATTEMPTS;
            const updatePayload = {
                loginAttempts: nextAttempts,
                lockUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
            };
            await fetchUser.update(updatePayload);

            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!fetchUser.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive. Contact support",
            });
        }

        if (!fetchUser.isEmailVerified) {
            const verificationToken = crypto.randomBytes(32).toString("hex");
            const verificationExpiresIn = new Date(Date.now() + 60 * 60 * 1000);
            await fetchUser.update({ verificationToken, verificationExpiresIn });

            const verificationLink = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;
            const html = verificationEmailTemplate(fetchUser.name, verificationLink);
            await sendEmail(normalizedEmail, "Verification Email", html);

            return res.status(403).json({
                success: false,
                message: "Email not verified. A new verification mail has been sent",
            });
        }

        if (fetchUser.loginAttempts || fetchUser.lockUntil) {
            await fetchUser.update({ loginAttempts: 0, lockUntil: null });
        }

        const token = generateToken(fetchUser.id, fetchUser.role);
        res.cookie("token", token, secureCookieOptions(Boolean(rememberMe)));

        return res.status(200).json({
            success: true,
            message: "User login successful",
            token,
        });
    } catch (error) {
        console.error("login error:", error);
        return res.status(500).json({
            success: false,
            message: "Error while logging in user",
        });
    }
};

const logOut = async (req, res) => {
    try {
        res.clearCookie("token", secureCookieOptions(false));
        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        console.error("logout error:", error);
        return res.status(500).json({
            success: false,
            message: "Error while logging out",
        });
    }
};

const verify = async (req, res) => {
    try {
        const { token } = req.query;
        const safeToken = typeof token === "string" ? token.trim() : "";

        if (!safeToken || safeToken.length < 32) {
            return res.status(400).json({
                success: false,
                message: "Token missing or invalid",
            });
        }

        const fetchUser = await User.findOne({ where: { verificationToken: safeToken } });

        if (!fetchUser) {
            return res.status(404).json({
                success: false,
                message: "Invalid token",
            });
        }

        if (fetchUser.isEmailVerified) {
            return res.status(200).json({
                success: true,
                message: "Email already verified. Please login",
            });
        }

        if (!fetchUser.verificationExpiresIn || fetchUser.verificationExpiresIn < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Verification token expired. Please login again",
            });
        }

        await fetchUser.update({
            isEmailVerified: true,
            verificationToken: null,
            verificationExpiresIn: null,
            loginAttempts: 0,
            lockUntil: null,
        });

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. Please login",
        });
    } catch (error) {
        console.error("verify error:", error);
        return res.status(500).json({
            success: false,
            message: "Error while verifying user",
        });
    }
};

const getMe = async (req, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized user",
            });
        }

        const fetchUser = await User.findByPk(userId, {
            attributes: [
                "id",
                "name",
                "email",
                "role",
                "isActive",
                "isEmailVerified",
                "createdAt",
            ],
        });

        if (!fetchUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: fetchUser,
        });
    } catch (error) {
        console.error("getMe error:", error);
        return res.status(500).json({
            success: false,
            message: "Error while fetching profile",
        });
    }
};

module.exports = {registerUser,login,logOut,verify,getMe}     
