const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['Teacher', 'Student'], required: true },
    faceEncoding: { type: [Number], default: [] }, // Kept strictly for students
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
