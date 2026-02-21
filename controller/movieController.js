const Movie = require("../models/MovieModel");
const {Op} = require("sequelize");

const getAllMovies = async(req,res) => {
    try {
        const movies = await Movie.findAll();

        return res.status(200).json({
            success : true,
            message : "Data Fetched Sucessfully",
            movies : movies
        });
    } catch (error) {
        return res.status(500).json({
            success : false,
            error : error.message
        });
    }
}

const getFilteredMovies = async (req, res) => {
  try {
    const { genres, yearFrom, yearTo, minRating, maxRating } = req.query;
    const filter = {};

    if (genres) {
      const genreArray = genres.split(",");

      filter.genres = {
        [Op.and]: genreArray.map(g => ({
          [Op.iLike]: `%${g}%`
        }))
      };
    }


    if (yearFrom || yearTo) {
      filter.year = {};
      if (yearFrom) filter.year[Op.gte] = Number(yearFrom);
      if (yearTo) filter.year[Op.lte] = Number(yearTo);
    }


    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating[Op.gte] = minRating;
      if (maxRating) filter.rating[Op.lte] = maxRating;
    }

    const movies = await Movie.findAll({
      where: filter,
      order: [["year", "DESC"]]
    });

    return res.status(200).json({
         success: true,
         data: movies 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
         success: false,
          message: "Server Error",
          error : error.message
        });
  }
};

const getMovieById = async(req,res) => {
  try {
    const {id} = req.params;

    if(!id){
      return res.status(400).json({
        success : false,
        message : "Invalid Try!"
      });
    }

    const fetchMovie =await Movie.findByPk(id);

    console.log(fetchMovie)

    if(!fetchMovie){
      return res.status(404).json({
        success : false,
        message : "Movie Not Available"
      });
    }

    return res.status(200).json({
      success : true,
      message : "Movie Fetched Sucessfully",
      data : fetchMovie
    });
  } catch (error) {
    return res.status(500).json({
      success : false,
      message : "Error while Fetching Movie!!",
      error : error.message
    });
  }
}

module.exports = {getAllMovies,getFilteredMovies, getMovieById}