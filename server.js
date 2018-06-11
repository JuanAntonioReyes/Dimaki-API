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

// ============ MONGO =========
var mongoose = require('mongoose');

mongoose.connect(config.mongoDB);

var db = mongoose.connection;

// TODO: Control DB error with db.on("error",...

db.once("open", function(callback){
	console.log("Connection to mongo correct");

	const port = process.env.PORT || 3000;
	app.listen(port, () => console.log("Server started on port " + port));
});

var Message = require("./models/message.js");
var User = require("./models/user.js");
// ============ /MONGO ========

app.get("/api/messages/:lat/:lon/:minDist/:maxDist", function(req, res) {
	var location = [ req.params.lon, req.params.lat ];
	var minDistance = req.params.minDist; // In meters
	var maxDistance = req.params.maxDist; // In meters

	var searchParams = {
											$geometry: { type: "Point",
																	 coordinates: location
																 },
											//$maxDistance: maxDistance,
											$minDistance: minDistance
										};
	// Only set the maxDistance if the parameter is not 0
	if (maxDistance !== '0') {
		searchParams.$maxDistance = maxDistance;
	}

	Message.find({ location: { $near: searchParams } },
		function (error, messages) {
			if (error) {
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

app.get("/api/userMessages", verifyToken, async function(req, res) {
	var userName;

	await User.findById(req.userId, function (error, user) {
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
		
		userName = user.name;
	});

	Message.find({ from: userName },
		function (error, messages) {
			if (error) {
				var response = {
					error: error,
					message: "Error getting the messages from the user"
				};
				return res.status(400).json(response);
			}

			return res.json(messages);
		}
	);
});

app.post("/api/messages", verifyToken, async function(req, res) {
	var newMessageData = req.body;

	if (newMessageData.text && typeof(newMessageData.hidden) === 'boolean') {
		// Check if the message text is at least 5 characters long
		if (newMessageData.text.length < 5) {
			var response = {
				error: 2,
				message:
					"The message is too short (Less than 5 characters)"
			};

			return res.status(400).json(response);
		}

		// Save the message date
		newMessageData.date = Date.now();

		await User.findById(req.userId, function (error, user) {
			if (error) {
				var response = {
					error: error,
					message: "Error retrieving the logged user"
				};

				return res.status(500).send(response);
			}

			if (user) {
				newMessageData.from = user.name;
			}	
		});

		// Extra message info not implemented yet
		newMessageData.public = true;
		newMessageData.to = [];
		newMessageData.expirationDate = -1;

		// Create the new message and save it
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
			error: 1,
			message: "Insufficient data provided to create a new message"
		};

		res.status(400).json(response);

	}

});

app.delete("/api/messages/:messageId", verifyToken, async function(req, res) {
	var messageId = req.params.messageId;
	var messageFrom, loggedUserName;

	await Message.findById(messageId, function (error, message) {
		if (error) {
			var response = {
				error: error,
				message: "Error retrieving the message"
			};

			return res.status(500).send(response);
		}

		if (message) {
			messageFrom = message.from;
		}	
	});

	await User.findById(req.userId, function (error, user) {
		if (error) {
			var response = {
				error: error,
				message: "Error retrieving the logged user"
			};

			return res.status(500).send(response);
		}

		if (user) {
			loggedUserName = user.name;
		}	
	});

	if (messageFrom === loggedUserName) {
		Message.remove({ _id: messageId }, function(err) {
			if (err) {
				var response = {
					error: error,
					message: "Error deleting the message"
				};

				return res.status(500).json(response);
			}

			return res.status(204);
		});
	}

});

// ============ AUTH CONTROL ============

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
				message: error.message
			};

			return res.status(401).json(response);
		}

		// Put the decoded id in the req to use it in the other functions
		req.userId = decoded.id;

		next();
	});

}

app.post("/api/registerUser", async function(req, res) {
	var newUserData = req.body;

	if (newUserData.name && newUserData.pass && newUserData.email) {
		// Check if the username and the password are at 
		// least 5 characters long and maximum 30 characters each
		if ((newUserData.name.length < 5) || (newUserData.name.length < 5) ||
				(newUserData.name.length > 30) || (newUserData.name.length > 30)) {
			var response = {
				error: 2,
				message:
					"The username and password must be between 5 and 30 characters long"
			};

			return res.status(400).json(response);
		}

		// Remove the spaces at the start and the end of the username and pass
		newUserData.name = newUserData.name.trim();
		newUserData.pass = newUserData.pass.trim();

		// Convert the name to uppercase
		newUserData.name = newUserData.name.toUpperCase();

		// Check if the username already exists in the DB
		var nameUsed = false;

		await User.findOne({ name: newUserData.name }, function (error, user) {
			if (user) {
				nameUsed = true;
			}

		});

		if (nameUsed) {
			var response = {
				error: 3,
				message:
					"The username is already in use"
			};

			return res.status(400).json(response);	
		}
	
		// Save the registration date
		newUserData.registerDate = Date.now();

		// Hash the password
		newUserData.pass = bcrypt.hashSync(newUserData.pass, 8);

		var newUser = new User(newUserData);

		newUser.save(function (error) {

			if (error) {
				var response = {
					error: error,
					message: "Error registering the user. Try again later."
				};

				return res.status(500).json(response);
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
			error: 1,
			message: "Insufficient data provided to create a new user"
		};

		return res.status(400).json(response);

	}
});

app.get("/api/loggedUser", verifyToken, function(req, res) {

	// Get the user by id to return it (Without the password)
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
		// Remove the spaces at the start and the end of the username and pass
		name = name.trim();
		pass = pass.trim();

		// Convert the name to uppercase
		name = name.toUpperCase();

		User.findOne({ name: name }, function (error, user) {

			if (error) {
				var response = {
					error: error,
					message: "Error loging the user. Try again later."
				};

				return res.status(500).json(response);
			}

			if (!user) {
				// No user found
				var response = {
					error: 2,
					message: "User not found"
				};

				return res.status(404).json(response);
			}

			var validPass = bcrypt.compareSync(pass, user.pass);

			if (!validPass) {
				var response = {
					error: 3,
					auth: false,
					token: null,
					message: "Incorrect password"
				};

				return res.status(401).json(response);
			}

			// Create token
			var token = createToken(user);

			var response = {
				auth: true,
				token: token
			};

			return res.send(response);

		});

	} else {

		var response = {
			error: 1,
			message: "Insufficient data provided to login an user"
		};

		res.status(400).json(response);

	}

});
// ============ /AUTH CONTROL ===========
