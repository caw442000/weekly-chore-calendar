// Import SQLite database library and path utilities
// better-sqlite3: A fast SQLite database for Node.js
// path: Helps build file paths correctly on any operating system
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory path (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store the database connection here - we only want one connection
let db;

// Get or create the database connection
// This ensures we only open the database file once, even if called multiple times
export const getDatabase = () => {
  if (!db) {
    // Create a new database connection to the SQLite file
    // The database file will be saved in the same folder as this file
    db = new Database(path.join(__dirname, 'chore_calendar.db'));
    // Enable foreign keys - this ensures data integrity
    // For example: if you delete a family, all related people/chores are deleted too
    db.pragma('foreign_keys = ON');
  }
  return db;
};

// Initialize the database - creates all the tables we need
// This runs once when the server starts
export const initDatabase = () => {
  const database = getDatabase();

  // Create tables - these are like spreadsheets that store our data
  // Each table has columns (fields) that define what data it can hold
  database.exec(`
    -- Families table: Stores each family group (e.g., "Smith Family")
    -- PRIMARY KEY: Each family has a unique ID
    -- NOT NULL: These fields must have a value
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,                    -- Unique identifier for the family
      name TEXT NOT NULL,                      -- Family name (e.g., "Smith Family")
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- When the family was created
    );

    -- Admins table: Stores admin users who can manage a family
    -- FOREIGN KEY: Links each admin to a family
    -- UNIQUE: Each email can only be used once per family
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,                    -- Unique identifier for the admin
      family_id TEXT NOT NULL,                -- Which family this admin belongs to
      email TEXT NOT NULL,                     -- Admin's email address (used for login)
      password_hash TEXT NOT NULL,            -- Encrypted password (never store plain passwords!)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,  -- If family deleted, delete admins too
      UNIQUE(family_id, email)                -- Can't have duplicate emails in same family
    );

    -- People table: Stores family members (the people who do chores)
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,                     -- Unique identifier for the person
      family_id TEXT NOT NULL,                -- Which family this person belongs to
      name TEXT NOT NULL,                     -- Person's name
      email TEXT NOT NULL,                    -- Person's email (used for login)
      phone TEXT,                             -- Optional phone number
      color TEXT NOT NULL,                    -- Color used to display this person's chores
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      UNIQUE(family_id, email)                -- Can't have duplicate emails in same family
    );

    -- Chores table: Stores the list of chores (e.g., "Dishes", "Trash")
    CREATE TABLE IF NOT EXISTS chores (
      id TEXT PRIMARY KEY,                    -- Unique identifier for the chore
      family_id TEXT NOT NULL,                -- Which family this chore belongs to
      label TEXT NOT NULL,                    -- Name of the chore (e.g., "Take out trash")
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
    );

    -- Assignments table: Links people to chores on specific days
    -- This is the core of the app - it says "John does Dishes on Monday"
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,                    -- Unique identifier for the assignment
      family_id TEXT NOT NULL,                -- Which family this assignment belongs to
      person_id TEXT NOT NULL,                -- Who is assigned this chore
      chore_id TEXT NOT NULL,                 -- Which chore they're assigned
      week_start_iso TEXT NOT NULL,           -- Which week (format: YYYY-MM-DD)
      day_index INTEGER NOT NULL,             -- Which day (0=Sunday, 1=Monday, etc.)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,  -- If person deleted, delete assignments
      FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE CASCADE,   -- If chore deleted, delete assignments
      UNIQUE(family_id, person_id, week_start_iso, day_index, chore_id)  -- Can't assign same chore twice to same person on same day
    );

    -- Indexes: These make database queries faster
    -- Think of them like an index in a book - helps find things quickly
    CREATE INDEX IF NOT EXISTS idx_assignments_family_week ON assignments(family_id, week_start_iso);
    CREATE INDEX IF NOT EXISTS idx_people_family ON people(family_id);
    CREATE INDEX IF NOT EXISTS idx_chores_family ON chores(family_id);
  `);

  console.log('✅ Database initialized');
};
