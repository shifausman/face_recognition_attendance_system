const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    presentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    absentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Evaluated and populated forcefully on termination
});

module.exports = mongoose.model('Session', sessionSchema);
