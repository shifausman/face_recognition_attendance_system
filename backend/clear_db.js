require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log("Connected to MongoDB Object mapping engine.");
    try {
        await mongoose.connection.db.dropDatabase();
        console.log('Database successfully wiped clear for Phase 2 structural shift.');
    } catch (e) {
        console.log("Empty or Error dropping:", e);
    }
    process.exit(0);
});
