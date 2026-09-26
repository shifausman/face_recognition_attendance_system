require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const User = require('./models/User');
const Class = require('./models/Class');
const Session = require('./models/Session');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// --- AUTH & USER MANAGEMENT ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ id: user._id, name: user.name, role: user.role });
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name, role, faceEncoding } = req.body;
        const user = new User({ username, password, name, role, faceEncoding });
        await user.save();
        res.status(201).json({ message: "User Registered", id: user._id, role: user.role });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/students', async (req, res) => {
    const students = await User.find({ role: 'Student' }, 'name username');
    res.json(students);
});

// --- TEACHER CLASS MANAGEMENT ---
app.post('/api/classes', async (req, res) => {
    try {
        const { name, teacherId } = req.body;
        const newClass = new Class({ name, teacherId, roster: [] });
        await newClass.save();
        res.json(newClass);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/classes/teacher/:teacherId', async (req, res) => {
    const classes = await Class.find({ teacherId: req.params.teacherId }).populate('roster', 'name username');
    res.json(classes);
});

app.post('/api/classes/:classId/enroll', async (req, res) => {
    try {
        const { studentId } = req.body;
        const updated = await Class.findByIdAndUpdate(req.params.classId,
            { $addToSet: { roster: studentId } }, { new: true }).populate('roster', 'name username');
        res.json(updated);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- SESSION & ATTENDANCE MANAGEMENT ---
app.post('/api/sessions/start', async (req, res) => {
    try {
        const { classId } = req.body;
        // Also close any currently open sessions for this class
        await Session.updateMany({ classId, isActive: true }, { isActive: false });

        const session = new Session({ classId, isActive: true, presentIds: [], absentIds: [] });
        await session.save();
        res.json(session);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/sessions/:sessionId/end', async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        const classObj = await Class.findById(session.classId);

        // Calculate Absentees by filtering roster against presentIds
        const presentStrs = session.presentIds.map(id => id.toString());
        const absentIds = classObj.roster.filter(sid => !presentStrs.includes(sid.toString()));

        session.isActive = false;
        session.absentIds = absentIds;
        await session.save();

        const populated = await Session.findById(session._id).populate('presentIds absentIds', 'name username');
        res.json(populated);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/attendance/log', async (req, res) => {
    try {
        const { sessionId, userId } = req.body;
        const session = await Session.findByIdAndUpdate(sessionId,
            { $addToSet: { presentIds: userId } }, { returnDocument: 'after' }).populate('presentIds', 'name');
        res.json(session);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/sessions/:sessionId/mark-present', async (req, res) => {
    try {
        const { userId } = req.body;
        const session = await Session.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ error: "Session not found" });

        // Add to present
        if (!session.presentIds.includes(userId)) {
            session.presentIds.push(userId);
        }
        // Remove from absentIds
        session.absentIds = session.absentIds.filter(id => id.toString() !== userId);

        await session.save();
        res.json(session);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/sessions/class/:classId', async (req, res) => {
    const sessions = await Session.find({ classId: req.params.classId })
        .sort({ date: -1 })
        .populate('presentIds absentIds', 'name username');
    res.json(sessions);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Node Core Backend running on port ${PORT}`));
