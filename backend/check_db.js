require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const users = await User.find({});
        console.log(JSON.stringify(users.map(u => ({ username: u.username, name: u.name })), null, 2));
    } catch (e) {
        console.log(e);
    }
    process.exit(0);
});
