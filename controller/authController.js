const { where } = require("sequelize");
const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { verificationEmailTemplate, sendEmail } = require("../helpers/sendEmail");
const generateToken = require("../helpers/generateToken");

const registerUser = async(req,res) => {
    const {name,email,password,agreeToTerms} = req.body;

    if(!name || !email || !password){
        return res.status(400).json({
            success : false,
            message : "All Fields are Required"
        });
    }

    if(!agreeToTerms){
        return res.status(400).json({
            success : false,
            message : "Please agree to Terms and Conditions!!"
        });
    }

    try{
        userExists =await User.findOne({where : {email}});
        if(userExists){
            return res.status(409).json({
                success : false,
                message : "User Already Exists!!"
            });
        }

        //Password Hashing
        const hashedPassword = await bcrypt.hash(password,10);

        //Verification Token
        const verificationToken = await crypto.randomBytes(32).toString('hex');

        const verificationExpiresIn = new Date(Date.now() + 1 * 60 * 60 * 1000);

        const verificationLink = `{${process.env.WEB_URL}/api/user/verify?token=${verificationToken}}`;

        const html = verificationEmailTemplate(name,verificationLink);

        //Send Email  to the user email to verify 
        const isEmailSent = sendEmail(email,"Verification Email",html);

        if(!isEmailSent){
            return res.status(400).json({
                success : false,
                message : "Error while sending Verification Code"
            });
        }

        //Create User
        const newUser = await User.create({
            name,
            email,
            password : hashedPassword,
            verificationToken : verificationToken,
            verificationExpiresIn : verificationExpiresIn,
            isEmailVerified : false,
            role : 'user',
            isActive : true
        });

        return res.status(201).json({
            success : true,
            message : "User Created successfully!!"
        });

    }catch(error){

        return res.status(500).json({
            success : false,
            message : "User Registration Failed!!",
            error : error.message
        });
    }
}

const login = async(req,res) =>{
    const {email,password, rememberMe} = req.body;

    if(!email || !password){
        return res.status(400).json({
            success : false,
            message : "All Fields are Required"
        });
    }

    try{

        const fetchUser = await User.findOne({where: {email}});
        if(!fetchUser){
            return res.status(400).json({
                success : false,
                message : 'Invalid Email or Password'
            });
        }

        const isValidUser = await bcrypt.compare(password,fetchUser.password);

        if(!isValidUser){
            return res.status(400).json({
                success : false,
                message : "Invalid Email or Password"
            });
        }

        if(!fetchUser.isEmailVerified){

            const verificationExpiresIn = new Date(Date.now() + 1 * 60 * 60 * 1000);
            await fetchUser.update({verificationExpiresIn : verificationExpiresIn});
            const verificationLink = `http://localhost:3000/api/user/verify?token=${fetchUser.verificationToken}`;
            const html = verificationEmailTemplate(await fetchUser.name,verificationLink);
            const isEmailSent = sendEmail(email,"Verification Email",html);

            if(!isEmailSent){
                return res.status(400).json({
                    success : false,
                    message : "Error while sending Verification Code"
                });
            }

            return res.status(400).json({
                success : false,
                message : "Your Mail isnot Verified!! Go back to your Mail and Try Verifying!!"
            });
        }

        if(!fetchUser.isActive){
            return res.status(400).json({
                success : false,
                message : "No User Found"
            });
        }

        const token = generateToken(fetchUser.id,fetchUser.role);

        return res.status(200).json({
            success : true,
            message : "User Login successfully",
            token : token
        });

    }catch(error){
        return res.status(500).json({
            success : false,
            message : "Error while Login User",
            error : error.message
        });
    }
}

const logOut = async(req,res) => {
    try{
        Cookies.remove('token');
        return res.status(200).json({
            success : true,
            message : "Logout successfully!!"
        });
    }catch(error){
        return res.status(500).json({
            success : false,
            message : "Error While Loging Out",
            error : error.message
        });
    }
}

module.exports = {registerUser,login,logOut}     