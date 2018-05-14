const express = require('express');
const app = express();

app.use(express.urlencoded());

var messageErrorJson = {
			error: "MESSAGE ERROR",
			errorDescription: "MESSAGE ERROR",
			url: "http://#"
		};

// ============ MONGO =========

var config = require('./config/config.js');
var mongoose = require('mongoose');

mongoose.connect(config.mongoDB);

var db = mongoose.connection;

// Control DB error with db.on("error",...

db.once("open", function(callback){
	console.log("Connection to mongo correct");

	app.listen(3000, function() {
		console.log("Server started in port 3000");
	});
});

var Message = require("./models/message.js");

// ============================

app.get("/api/messages", function(req, res) {
	
	Message.find({}, function (error, messages) {
		if (error) {
			console.error(error);
		}

		res.json(messages);
	});

});

app.get("/api/messages/:id", function(req, res) {
	var id = req.params.id;

	Message.findById(id, function (error, message) {
		if (error) {
			console.error(error);
			res.status(404).json(messageErrorJson);
		}

		res.json(message);
	});

});

app.post("/api/messages", function(req, res) {
	var db = req.db;
	var newText = req.body.text;

	if (newText) {

		var newMessage = new Message({
			text: newText
		});

		newMessage.save(function (error) {
			if (error) {
				console.log(error);
			}

			res.status(201).json(newMessage);
		});

	} else {

		var error = {
			error: "Insufficient data",
			errorDescription: "The POST method needs a message text",
			url: "http://#"
		};

		res.status(400).json(error);

	}

});

/*app.put("/api/messages/:id", function(req, res) {
	// NOT IMPLEMENTED
	// BUT THIS WORKS WITH STATIC DATA

	var id = req.params.id;

	var selected = messages.filter( (message) => { return message.id == id } )[0] || null;

	if (selected) {
		selected.text = req.body.text;
		
		res.json(selected);
	} else {
		res.status(404).json(messageErrorJson);
	}

});*/

app.delete("/api/messages/:id", function(req, res) {

	var id = req.params.id;

	var db = req.db;
	Message.remove({ _id: id }, function(error, post){
		if (error) {
			res.status(404).json(messageErrorJson);
		}

		res.sendStatus(204);
	});

});
