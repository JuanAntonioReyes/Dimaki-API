var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var MessageSchema = new Schema({
  text: String,
	location: {
		type: [Number],
		index: '2d'
	}
});

var Message = mongoose.model("Message", MessageSchema);
module.exports = Message;