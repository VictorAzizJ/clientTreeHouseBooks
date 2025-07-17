const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// A “program” (e.g. story-time, summer camp, etc.)
const ProgramSchema = new Schema({
  name:        { type: String, required: true },
  description: { type: String }
});

module.exports = mongoose.model('Program', ProgramSchema);
