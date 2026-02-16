// Import required libraries and modules
// express: Creates the web server that handles HTTP requests
// cors: Allows the frontend (running on different port) to talk to this backend
// dotenv: Loads environment variables from .env file
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import familyRoutes from './routes/families.js';
import personRoutes from './routes/people.js';
import choreRoutes from './routes/chores.js';
import assignmentRoutes from './routes/assignments.js';

// Load environment variables (like PORT, JWT_SECRET) from .env file
dotenv.config();

// Create the Express application - this is our web server
const app = express();
// Use port from environment variable, or default to 3001 if not set
const PORT = process.env.PORT || 3001;

// Middleware - these run on every request before it reaches our routes
// cors(): Allows requests from the frontend (which runs on port 5173)
// express.json(): Converts incoming JSON data into JavaScript objects we can use
app.use(cors());
app.use(express.json());

// Set up the database tables when server starts
// This creates all the tables (families, people, chores, etc.) if they don't exist
initDatabase();

// Routes - these define what URLs the server responds to
// When someone visits /api/auth, it uses the authRoutes handlers
// When someone visits /api/families, it uses the familyRoutes handlers
// etc.
app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/people', personRoutes);
app.use('/api/chores', choreRoutes);
app.use('/api/assignments', assignmentRoutes);

// Health check endpoint - a simple way to test if the server is running
// Visit http://localhost:3001/api/health to see if server is up
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Weekly Chore Calendar API is running' });
});

// Start the server and listen for incoming requests on the specified port
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
