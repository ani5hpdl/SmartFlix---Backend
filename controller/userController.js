const User = require("../models/UserModel");

const createUser = async(req,res) => {
    const {name,email,password,role} = req.body;

    if(!name || !email || !password || !role){
        return res.status(400).json({
            success : false,
            message : "All Fields are Required"
        });
    }

    try{
        userExists =await User.findOne({where : {email}});
        if(userExists){
            return res.status(409).json({
                success : false,
                message : "Email Already in Use!"
            });
        }

        //Password Hashing
        const hashedPassword = await bcrypt.hash(password,10);

        //Create User
        const newUser = await User.create({
            name,
            email,
            password : hashedPassword,
            isEmailVerified : true,
            role,
            isActive : true
        });

        return res.status(201).json({
            success : true,
            message : "User Created successfully!!"
        });

    }catch(error){

        return res.status(500).json({
            success : false,
            message : "User Creation Failed!!",
            error : error.message
        });
    }
}

const updateUser = async(req,res) => {
    const {id} = req.params.id;
    const {name,role,isActive,isEmailVerified,lockUntil} = req.body;
    try {
        userExists =await User.findOne({where : {id}});
        if(!userExists){
            return res.status(409).json({
                success : false,
                message : "User Not Found!"
            });
        }

        await userExists.update({
            name: name ?? userExists.name,
            role: role ?? userExists.role,
            isActive: isActive ?? userExists.isActive,
            isEmailVerified: isEmailVerified ?? userExists.isEmailVerified,
            lockUntil: lockUntil ?? userExists.lockUntil
        });

        return res.status(200).json({
            success :  true,
            message : "User Updated Sucessfully!",
            data : userExists
        });

    } catch (error) {
        return res.status(500).json({
            success : false,
            message : "User Update Failed!!",
            error : error.message
        });
    }
}

const getAllUser = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "isActive", "isEmailVerified", "lockUntil"]
    });

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
      data: users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
};


const getUserById = async(req,res) => {
    try {
        const id = req.params;
        const fetchUser =await User.findOne({where : {id : id},attributes: ["name", "email","role","isActive","isEmailVerified","lockUntil"]});
        if(!fetchUser){
            return res.status(400).json({
                success : false,
                message : "No User Found!"
            });
        }

        return res.status(200).json({
            success  : true,
            message : "User Feched Sucessfully",
            data : fetchUser
        });
        
    } catch (error) {
        return res.status(500).json({
            success : false,
            message : "Error while Fetching Data!",
            error : error.message
        });
    }
}


module.exports = {createUser,getAllUser,getUserById,updateUser}