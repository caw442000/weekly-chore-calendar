// Import required modules
// express: Web framework for handling HTTP requests
// bcrypt: Library for securely comparing passwords (never compare plain passwords!)
// getDatabase: Function to get database connection
// generateToken: Function to create JWT authentication tokens
import express from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/database.js';
import { generateToken } from '../middleware/auth.js';

// Create a router for authentication routes
const router = express.Router();
// Get the database connection
const db = getDatabase();

// Route: POST /api/auth/admin/login
// Purpose: Allows an admin to log in with email and password
router.post('/admin/login', async (req, res) => {
  try {
    // Get email and password from the request body (sent from frontend)
    const { email, password } = req.body;

    // Validate that both email and password were provided
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Look up the admin in the database by email
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);

    // If no admin found with that email, return error
    // We don't say "email not found" for security (don't reveal which emails exist)
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare the provided password with the stored password hash
    // bcrypt.compare securely checks if passwords match without storing plain passwords
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If password is correct, create a JWT token
    // This token proves the user is logged in and contains their info
    const token = generateToken({
      adminId: admin.id,           // Who is logged in
      familyId: admin.family_id,    // Which family they manage
      type: 'admin'                 // What type of user they are
    });

    // Send back the token and admin info
    res.json({
      token,  // Frontend will save this and send it with future requests
      admin: {
        id: admin.id,
        email: admin.email,
        familyId: admin.family_id
      }
    });
  } catch (error) {
    // If something unexpected went wrong, log it and return error
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: POST /api/auth/user/login
// Purpose: Allows a regular user (family member) to log in with just their email
// Note: Users don't need passwords - they just need to know their email
router.post('/user/login', (req, res) => {
  try {
    // Get email from the request body
    const { email } = req.body;

    // Validate that email was provided
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Look up the person in the database by email
    const person = db.prepare('SELECT * FROM people WHERE email = ?').get(email);

    // If no person found with that email, return error
    if (!person) {
      return res.status(404).json({ error: 'No account found with that email address' });
    }

    // Create a JWT token for the user
    const token = generateToken({
      personId: person.id,         // Who is logged in
      familyId: person.family_id,  // Which family they belong to
      type: 'user'                  // What type of user they are
    });

    // Send back the token and person info
    res.json({
      token,  // Frontend will save this and send it with future requests
      person: {
        id: person.id,
        name: person.name,
        email: person.email,
        familyId: person.family_id
      }
    });
  } catch (error) {
    // If something unexpected went wrong, log it and return error
    console.error('User login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
