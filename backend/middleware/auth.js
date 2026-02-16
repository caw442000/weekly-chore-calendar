// Import JWT (JSON Web Token) library
// JWT is a way to securely send information between frontend and backend
// It's like a signed ID card that proves who you are
import jwt from 'jsonwebtoken';

// Secret key used to sign and verify tokens
// In production, this should be a long random string stored in environment variables
// Never share this secret - it's used to verify that tokens are legitimate
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware function: Checks if a request has a valid authentication token
// This runs before routes that require authentication
// If the token is valid, it adds user info to the request and continues
// If the token is invalid or missing, it returns an error
export const authenticateToken = (req, res, next) => {
  // Get the Authorization header from the request
  // Format: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  // Extract just the token part (everything after "Bearer ")
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no token was provided, reject the request
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Verify that the token is valid and hasn't been tampered with
  // jwt.verify checks:
  // 1. The token was signed with our secret key
  // 2. The token hasn't expired
  // 3. The token format is correct
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Token is invalid or expired
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Token is valid! Add user info to the request object
    // This lets routes know who is making the request
    req.user = user;
    // Call next() to continue to the actual route handler
    next();
  });
};

// Function: Creates a new JWT token
// This is called when a user logs in successfully
// The token contains information about the user (like their ID and role)
export const generateToken = (payload) => {
  // Sign the token with our secret key
  // expiresIn: '7d' means the token is valid for 7 days
  // After 7 days, the user will need to log in again
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};
