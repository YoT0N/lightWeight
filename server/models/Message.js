const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  user: String,
  recipient: { type: String, default: null },
  text: String,
  room: {type: String, default: "general"},
  isPrivate: {type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Message', MessageSchema);
