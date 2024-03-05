const express = require('express');
const bodyparser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

var app = express();

// configuring port
let PORT = 3000;

// to parse
app.use(bodyparser.json());

// using cors for connecting server & client
app.use(cors());

// connecting to mongoose database
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1:27017/').then(
    () => { console.log('ProjectManagement Database is connected') },
    err => { console.log('Can not connect to the ProjectManager database' + err) }
);
;

app.listen(PORT, () => {
    console.log('Server listening Port ' + PORT);
})


// Mongoose Schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['manager', 'employee'], required: true },
  });
  
  // Mongoose Model
  const User = mongoose.model('User', userSchema);
  
  // Registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const { username, password, role } = req.body;
  
      // Check if the username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const newUser = new User({ username, password: hashedPassword, role });
  
      // Save the user to the database
      await newUser.save();
  
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


  
  // login endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
  
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      // Generate JWT token for authentication
      const token = jwt.sign({ userId: user._id, role: user.role }, 'your-secret-key', { expiresIn: '1h' });
  
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
