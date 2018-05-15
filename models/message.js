var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var MessageSchema = new Schema({
  text: String,
	location: {
		type: [Number],
		index: '2d'
	},
	date: Number,
	from: String,
	public: Boolean,
	to: [String],
	duration: Number
});

var Message = mongoose.model("Message", MessageSchema);
module.exports = Message;