const express = require('express');
const app = express();
const cors = require('cors'); 
const { sequelize, connectDB } = require("./database/db")
const mainRouter = require("./routes/mainRouter");
require("./models/associations");
require('dotenv').config();

app.use(cors({
    origin : ["http://localhost:5173","http://localhost:5174"],
    credentials : true
}));

app.use(express.json());
app.use("/api", mainRouter);

const startServer = async () => {
    await connectDB();
    await sequelize.sync();
    app.listen(3000, ()=>{
    console.log(`Server is running on port ${3000}`);
    console.log(`Server is running on port ${process.env.WEB_URL}`);
});
};

startServer();
