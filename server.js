const express = require('express');
const app = express();

app.use(express.urlencoded());

var messageErrorJson = {
			error: "Not found",
			errorDescription: "The message was not found",
			url: "http://#"
		};

var messages = [];
for (var i = 0; i < 10; i++) {
	var message = {
		id: i,
		text: "Mensaje prueba " + i
	};

	messages.push(message);
}

app.get("/api/messages", function(req, res) {
	res.json(messages);
});

app.get("/api/messages/:id", function(req, res) {
	var id = req.params.id;

	var selected = messages.filter( (message) => { return message.id == id } )[0] || null;

	if (selected) {
		res.json(selected);
	} else {
		res.status(404).json(messageErrorJson);
	}

});

app.post("/api/messages", function(req, res) {
	var newId = articles.length;
	var newText = req.body.text;

	if (newText) {
		var newMessage = {
			id: newId,
			text: newText
		};

		messages.push(newMessage);

		res.status(201).json(newMessage);
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
	
	var id = req.params.id;

	var selected = messages.filter( (message) => { return message.id == id } )[0] || null;

	if (selected) {
		selected.text = req.body.text;
		
		res.json(selected);
	} else {
		res.status(404).json(messageErrorJson);
	}

});*/

app.delete("/api/message/:id", function(req, res) {
	var id = req.params.id;

	var selected = messages.filter( (message) => { return message.id == id } )[0] || null;

	if (selected) {
		var newMessages = messages.filter( (message) => { return message.id != id } ) || null;

		messages = newMessages;

		res.sendStatus(204);
	} else {
		res.status(404).json(messageErrorJson);
	}
});

app.listen(3000, function() {
	console.log("Server started in port 3000");
});
