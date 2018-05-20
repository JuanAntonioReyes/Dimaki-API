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

app.get("/api/messages/:lat/:lon/:maxDist/:minDist", function(req, res) {
	// TODO: CHECK HOW CAN I PASS THE LOCATION PARAMETERS LIKE THE ONES IN POST

	//var location = [ req.params.lat, req.params.lon ];
	var location = [ req.params.lon, req.params.lat ];
	//var maxDistance = 0.01; // In radians (TODO: Check how to do in meters)
	// var maxDistance = 50;
	var maxDistance = req.params.maxDist; // In meters
	//var minDistance = 0;
	var minDistance = req.params.minDist; // In meters

/*	Message.find({location: {
											$near: location,
											$maxDistance: maxDistance
										 }
							 },
		function (error, messages) {
			if (error) {
				console.error(error);
			}

			return res.json(messages);
		}
	);*/

	Message.find({location: {
														$near: {
															$geometry: { type: "Point",
																					 coordinates: location
																				 },
															$maxDistance: maxDistance,
															$minDistance: minDistance
														}
													}
							 },
		function (error, messages) {
			if (error) {
				//console.error(error);
				var response = {
					error: error,
					message: "Error getting the messages from the location"
				};
				return res.status(400).json(response);
			}

			return res.json(messages);
		}
	);

});

/*app.get("/api/messages/:id", function(req, res) {
	var id = req.params.id;

	Message.findById(id, function (error, message) {
		if (error) {
			console.error(error);
			return res.status(404).json(errorJson);
		}

		return res.json(message);
	});

});*/

app.post("/api/messages", verifyToken, function(req, res) {
	var newMessageData = req.body;
	
	// TODO: I need to control that all the required data has been sent to the post
	if (newMessageData.text) {

		var newMessage = new Message(newMessageData);

		newMessage.save(function (error) {
			if (error) {
				var response = {
					error: error,
					message: "Error saving the new message"
				};
				return res.status(500).json(response);
			}

			return res.status(201).json(newMessage);
		});

	} else {

		var response = {
			error: error,
			message: "Insufficient data provided to create a new message"
		};
		res.status(400).json(response);

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
			return res.status(404).json(errorJson);
		}

		return res.sendStatus(204);
	});

});*/

// =============== AUTH =======================================================

function createToken(user) {
	var payload = { id: user._id };
	var options = { expiresIn: 86400 /*24 hours*/ };

	// Create token
	var token = jwt.sign(payload, config.tokenSecret, options);

	return token;
}

// Verify token middleware
function verifyToken(req, res, next) {

	var token = req.headers['x-access-token'];
	
	if (!token) {
		var response = {
			auth: false,
			message: 'No user token provided'
		};
		res.status(401).json(response);
	}

	jwt.verify(token, config.tokenSecret, function(error, decoded) {
		if (error) {
			var response = {
				auth: false,
				message: 'Invalid user token'
			};
			return res.status(401).json(response);
		}

		// Put the decoded id in the req to use it in the other fucntions
		req.userId = decoded.id;

		next();
	});

}

app.post("/api/registerUser", function(req, res) {

	var newUserData = req.body;
	/*newUserData:
			-name
			-pass
			-email
			-registerDate
	*/

	if (newUserData.name && newUserData.pass &&
			newUserData.email && newUserData.registerDate) {

		// Hash the password
		newUserData.pass = bcrypt.hashSync(newUserData.pass, 8);

		var newUser = new User(newUserData);

		newUser.save(function (error) {
			if (error) {
				//console.log(error);
				var response = {
					error: error,
					message: "Error registering the user"
				};
				return res.json(response);
			}

			// Create token
			var token = createToken(newUser);

			var response = {
				auth: true,
				token: token
			};

			return res.status(201).json(response);
		});

	} else {

		var response = {
			error: error,
			message: "Insufficient data provided to create a new user"
		};
		res.status(400).json(response);

	}

});

app.get("/api/loggedUser", verifyToken, function(req, res) {

	User.findById(req.userId, { pass: 0 }, function (error, user) {

		if (error) {
			var response = {
				error: error,
				message: "Error retrieving the logged user"
			};
			return res.status(500).send(response);
		}

		if (!user) {
			// No user found
			var response = {
				message: "No user found"
			};
			return res.status(404).send(response);
		}
		
		return res.json(user);
	});

});

app.post("/api/loginUser", function(req, res) {

	var pass = req.body.pass;
	var name = req.body.name;

	if (pass && name) {

		User.findOne({ name: name }, function (error, user) {
			if (error) {
				var response = {
					error: error,
					message: "Error loging the user"
				};
				return res.status(500).json(response);
			}

			if (!user) {
				// No user found
				var response = {
					message: "No user found"
				};
				return res.status(404).json(response);
			}

			var validPass = bcrypt.compareSync(pass, user.pass);

			if (!validPass) {
				var response = {
					auth: false,
					token: null
				};
				return res.status(401).json(response);
			}

			// Create token
			var token = createToken(user);

			var response = {
				auth: true,
				token: token
			};

			//console.log("LOGIN SUCCESS");
			return res.send(response);
		});

	} else {

		var response = {
			error: error,
			message: "Insufficient data provided to login a user"
		};
		res.status(400).json(response);

	}

});

/*app.get('/api/logoutUser', function(req, res) {
	var response = { auth: false, token: null };

	res.json(response);
});*/

// ============================================================================


