const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'Present' }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
