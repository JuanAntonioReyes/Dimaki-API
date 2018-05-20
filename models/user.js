var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  name: String,
	pass: String,
	email: String,
	registerDate: Date
});

var User = mongoose.model("User", UserSchema);
module.exports = User;