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
mongoose.connect('mongodb://127.0.0.1:27017/Projectmanager').then(
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
    fullname:{ type: String, required: true },
    email:{ type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['manager', 'employee'], required: true } 
  });
  
  // Mongoose Model
  const User = mongoose.model('User', userSchema);

  const Project = mongoose.model('Project', {
    id:Number,
    name: String,
    description: String,
    tasks: [
      {
        id:Number,
        name: String,
        description: String,
        priority: String,
        status: String,
      },
    ],
  });
  
  // Registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const { username, fullname, email, password, role  } = req.body;
  
      // Check if the username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const newUser = new User({ username,fullname,email, password: hashedPassword, role});
  
      // Save the user to the database
      await newUser.save();
  
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/user', async (req, res) => {
    try {
      const user = await User.find();
      res.json(user);
    } catch (error) {
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
      const JWtoken = jwt.sign({ userId: user._id, role: user.role }, 'your-secret-key', { expiresIn: '1h' });
  
      res.json({ token: JWtoken,  role: user.role });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
    // Routes
    app.get('/api/projects', async (req, res) => {
      try {
        const projects = await Project.find();
        res.json(projects);
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    
    app.post('/api/projects', async (req, res) => {
      try {
        // Destructure properties from the request body
        const { name, description, tasks } = req.body;
    
        // Basic validation: Check if required fields are provided
        if (!name || !description || !tasks) {
          return res.status(400).json({ error: 'Bad Request - Missing required fields' });
        }
    
        // Create a new project instance
        const project = new Project({ name, description, tasks });
    
        // Save the project to the database
        const savedProject = await project.save();
    
        // Respond with the saved project data
        res.status(201).json(savedProject);
      } catch (error) {
        // Handle specific errors, log others
        if (error.name === 'ValidationError') {
          // Mongoose validation error (e.g., required field missing)
          return res.status(400).json({ error: 'Validation Error', details: error.errors });
        } else {
          // Log other errors
          console.error('Error creating project:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      }
    });
    
    // Update a project
app.put('/api/projects/:projectId', async (req, res) => {
  const { name, description, tasks } = req.body;
  
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.projectId,
      { name, description, tasks },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a project
app.delete('/api/projects/:projectId', async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndRemove(req.params.projectId);

    if (!deletedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a task within a project
app.put('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
  const { name, description, priority, status } = req.body;

  try {
    const updatedTask = await Project.findOneAndUpdate(
      { _id: req.params.projectId, 'tasks._id': req.params.taskId },
      { 
        $set: {
          'tasks.$.name': name,
          'tasks.$.description': description,
          'tasks.$.priority': priority,
          'tasks.$.status': status,
        }
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a task within a project
app.delete('/api/projects/:projectId/tasks/:taskId', async (req, res) => {
  try {
    const deletedTask = await Project.findOneAndUpdate(
      { _id: req.params.projectId },
      { $pull: { tasks: { _id: req.params.taskId } } },
      { new: true }
    );

    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

  
