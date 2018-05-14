const express = require('express');
const app = express();

app.get("/api/articles", function(req, res) {
	res.send('Hello');
});

app.listen(3000, function() {
	console.log("Listening in port 3000");
});
