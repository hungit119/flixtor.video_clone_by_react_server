const express = require("express");
const filmController = require("../controllers/filmController");
const Router = express.Router();

//[GET] /api/films/:condition/key/value
Router.get("/films/:condition/:key/:value", filmController.selectByCondition);
// [GET] /api/films/type/:params
Router.get("/films/type/:params", filmController.filmsType);
// [GET] /api/film/:id
Router.get("/film/:id", filmController.film);
// [POST] /api/film/create
Router.post("/film/create", filmController.create);
// [GET] /api/films/lastest/:type
Router.get("/films/lastest/:type", filmController.selectLastest);
// [GET] /api/films/suggest/:id
Router.get("/films/suggest/:id", filmController.selectFilmsSuggest);
// [GET] /api/films
Router.get("/films", filmController.read);
// [GET] /api
Router.get("/", filmController.index);

module.exports = Router;
