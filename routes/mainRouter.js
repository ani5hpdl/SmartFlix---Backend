const router = require("express").Router();

router.get("/", (req, res) => {
  return res.json({
    message: "Welcome to the API root",
  });
});

router.use("/auth", require("./authRoutes"));
router.use("/movies", require("./movieRoutes"));
router.use("/user", require("./userRoutes"));
router.use("/review", require("./reviewRoutes"));

module.exports = router;
