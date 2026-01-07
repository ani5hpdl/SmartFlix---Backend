const jwt = require("jsonwebtoken")

const generateToken = (userId , role) => {
    const payload = {userId,role};
    const token = jwt.sign(payload,process.env.JWT_SECRET,{
        expiresIn : "7d"
    });

    return token;
}

module.exports = generateToken