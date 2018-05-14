var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var MessageSchema = new Schema({
	latitude: String,
	longitude: String,
  text: String
});

var Message = mongoose.model("Message", MessageSchema);
module.exports = Message;