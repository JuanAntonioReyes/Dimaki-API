const express = require('express');
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const config = require('./config/config.js');

const app = express();
const cors = require('cors');
app.use(bodyParser.json())
app.use(express.urlencoded());
app.use(cors());

const serverPort = 3000;

const errorJson = {
			error: "ERROR",
			errorDescription: "ERROR",
			url: "http://#"
		};

// ============ MONGO =========

var mongoose = require('mongoose');

mongoose.connect(config.mongoDB);

var db = mongoose.connection;

// Control DB error with db.on("error",...

db.once("open", function(callback){
	console.log("Connection to mongo correct");

	app.listen(serverPort, function() {
		console.log("Server started in port " + serverPort);
	});
});

var Message = require("./models/message.js");
var User = require("./models/user.js");

// ============================

app.get("/api/messages/:lat/:lon", function(req, res) {
	// TODO: CHECK HOW CAN I PASS THE LOCATION PARAMETERS LIKE THE ONES IN POST

	var maxDistance = 0.01; // In radians (TODO: Check how to do in meters)
	var location = [ req.params.lat, req.params.lon ];

  Message.find({location: {
  										$near: location,
  										$maxDistance: maxDistance
  									 }
  						 },
  	function (error, messages) {
			if (error) {
				console.error(error);
			}

			res.json(messages);
		}
	);

});

/*app.get("/api/messages/:id", function(req, res) {
	var id = req.params.id;

	Message.findById(id, function (error, message) {
		if (error) {
			console.error(error);
			res.status(404).json(errorJson);
		}

		res.json(message);
	});

});*/

app.post("/api/messages", function(req, res) {
	var newMessageData = req.body;
	
	// TODO: I need to control that all the required data has been sent to the post
	if (newMessageData.text) {

		var newMessage = new Message(newMessageData);

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
		res.status(404).json(errorJson);
	}

});*/

/*app.delete("/api/messages/:id", function(req, res) {

	var id = req.params.id;
	
	Message.remove({ _id: id }, function(error, post){
		if (error) {
			res.status(404).json(errorJson);
		}

		res.sendStatus(204);
	});

});*/

// =============== AUTH =======================================================

app.post("/api/register", function(req, res) {

	var newUserData = req.body;
	/*newUserData:
			-name
			-pass
			-email
	*/

	// Hash the password
	newUserData.pass = bcrypt.hashSync(newUserData.pass, 8);

	var newUser = new User(newUserData);

	newUser.save(function (error) {
		if (error) {
			console.log(error);
		}

		// Create token
		var token = jwt.sign({ id: newUser._id },
													config.tokenSecret,
													{ expiresIn: 86400 /*24 hours*/ }
												);

		var response = { auth: true, token: token };

		res.status(201).json(response);
	});

});

app.get('/api/loggedUser', function(req, res) {

	var token = req.headers['x-access-token'];

	if (!token) {
		var response = { auth: false, message: 'No user token' };

		return res.status(401).json(response);
	}

	jwt.verify(token, config.tokenSecret, function(error, decoded) {
		if (error) {
			var response = { auth: false, message: 'Invalid user token' }

			return res.status(500).json(response);
		}

		//res.send(decoded);
		User.findById(decoded.id, { pass: 0 }, function (error, user) {

			if (error) {
				return res.status(500).send(errorJson);
			}

			if (!user) {
				return res.status(404).send(errorJson);
			}

			res.json(user);
		});

	});

});

// ============================================================================


