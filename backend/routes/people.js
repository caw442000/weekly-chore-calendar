import express from 'express';
import { getDatabase } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

const getDefaultColorForIndex = (index) => {
  const palette = ['#f97373', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#a855f7'];
  return palette[index % palette.length];
};

// Get all people in a family
router.get('/family/:familyId', authenticateToken, (req, res) => {
  try {
    const { familyId } = req.params;

    if (req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const people = db.prepare('SELECT * FROM people WHERE family_id = ?').all(familyId);
    res.json(people);
  } catch (error) {
    console.error('Get people error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add person (admin only)
router.post('/family/:familyId', authenticateToken, (req, res) => {
  try {
    const { familyId } = req.params;
    const { name, email, phone } = req.body;

    if (req.user.type !== 'admin' || req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    const personCount = db.prepare('SELECT COUNT(*) as count FROM people WHERE family_id = ?').get(familyId);
    const color = getDefaultColorForIndex(personCount.count);

    const personId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);

    db.prepare(
      'INSERT INTO people (id, family_id, name, email, phone, color) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(personId, familyId, name, email, phone || null, color);

    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(personId);
    res.status(201).json(person);
  } catch (error) {
    console.error('Add person error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Person with this email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update person (admin only)
router.put('/:personId', authenticateToken, (req, res) => {
  try {
    const { personId } = req.params;
    const { name, email, phone, color } = req.body;

    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(personId);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    if (req.user.type !== 'admin' || req.user.familyId !== person.family_id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    db.prepare(
      'UPDATE people SET name = ?, email = ?, phone = ?, color = ? WHERE id = ?'
    ).run(name, email, phone || null, color || person.color, personId);

    const updated = db.prepare('SELECT * FROM people WHERE id = ?').get(personId);
    res.json(updated);
  } catch (error) {
    console.error('Update person error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Person with this email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete person (admin only)
router.delete('/:personId', authenticateToken, (req, res) => {
  try {
    const { personId } = req.params;

    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(personId);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    if (req.user.type !== 'admin' || req.user.familyId !== person.family_id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    db.prepare('DELETE FROM people WHERE id = ?').run(personId);
    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Delete person error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
