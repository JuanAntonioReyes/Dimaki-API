var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var MessageSchema = new Schema({
  text: String,
	location: {
		type: { type: String },
		coordinates: []
	},
	date: Number,
	from: String,
	public: Boolean,
	to: [String],
	expirationDate: Number
});

MessageSchema.index({ "location": "2dsphere" });

var Message = mongoose.model("Message", MessageSchema);
module.exports = Message;