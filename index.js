const express = require('express');
const app = express();
const cors = require('cors'); 
const { sequelize, connectDB } = require("./database/db")
require('dotenv').config();

app.use(cors({
    origin : ["http://localhost:5173","http://localhost:5174"],
    credentials : true
}));

app.get("/",(req,res) =>{
    res.json({
        message : "Welcome to the Index Page"
    })
})

app.use(express.json());
app.use("/api/auth",require('./routes/authRoutes'))
app.use("/api/movies",require('./routes/movieRoutes'))
app.use("/api/user",require('./routes/userRoutes'))
app.use("/api/review",require('./routes/reviewRoutes'))

const startServer = async () => {
    await connectDB();
    await sequelize.sync();
    app.listen(3000, ()=>{
    console.log(`Server is running on port ${3000}`);
    console.log(`Server is running on port ${process.env.WEB_URL}`);
});
};

startServer();
