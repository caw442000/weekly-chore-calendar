import express from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

const defaultChores = [
  { id: 'dishes', label: 'Dishes' },
  { id: 'trash', label: 'Trash' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'vacuum', label: 'Vacuum' }
];

// Create family
router.post('/', async (req, res) => {
  try {
    const { name, adminEmail, adminPassword } = req.body;

    if (!name || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Family name, admin email, and password required' });
    }

    const familyId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
    const adminId = 'admin-' + Date.now().toString(36);

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    db.transaction(() => {
      // Create family
      db.prepare('INSERT INTO families (id, name) VALUES (?, ?)').run(familyId, name);

      // Create admin
      db.prepare(
        'INSERT INTO admins (id, family_id, email, password_hash) VALUES (?, ?, ?, ?)'
      ).run(adminId, familyId, adminEmail, passwordHash);

      // Create default chores
      const insertChore = db.prepare('INSERT INTO chores (id, family_id, label) VALUES (?, ?, ?)');
      defaultChores.forEach((chore) => {
        insertChore.run(chore.id + '-' + Date.now().toString(36), familyId, chore.label);
      });
    })();

    const token = generateToken({
      adminId: adminId,
      familyId: familyId,
      type: 'admin'
    });

    res.status(201).json({
      token,
      family: {
        id: familyId,
        name
      }
    });
  } catch (error) {
    console.error('Create family error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get family by ID (with all related data)
router.get('/:familyId', authenticateToken, (req, res) => {
  try {
    const { familyId } = req.params;

    // Verify user has access to this family
    if (req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const family = db.prepare('SELECT * FROM families WHERE id = ?').get(familyId);
    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    const admins = db.prepare('SELECT id, email FROM admins WHERE family_id = ?').all(familyId);
    const people = db.prepare('SELECT * FROM people WHERE family_id = ?').all(familyId);
    const chores = db.prepare('SELECT * FROM chores WHERE family_id = ?').all(familyId);
    const assignments = db.prepare('SELECT * FROM assignments WHERE family_id = ?').all(familyId);

    res.json({
      ...family,
      admins,
      people,
      chores,
      assignments
    });
  } catch (error) {
    console.error('Get family error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add admin (admin only)
router.post('/:familyId/admins', authenticateToken, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { email, password } = req.body;

    if (req.user.type !== 'admin' || req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const adminId = 'admin-' + Date.now().toString(36);
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(
      'INSERT INTO admins (id, family_id, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(adminId, familyId, email, passwordHash);

    res.status(201).json({
      id: adminId,
      email,
      familyId
    });
  } catch (error) {
    console.error('Add admin error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Admin with this email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove admin (admin only)
router.delete('/:familyId/admins/:adminId', authenticateToken, (req, res) => {
  try {
    const { familyId, adminId } = req.params;

    if (req.user.type !== 'admin' || req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins WHERE family_id = ?').get(familyId);
    if (adminCount.count <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin' });
    }

    if (req.user.adminId === adminId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    db.prepare('DELETE FROM admins WHERE id = ? AND family_id = ?').run(adminId, familyId);

    res.json({ message: 'Admin removed successfully' });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
