import express from 'express';
import { getDatabase } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// Get all chores for a family
router.get('/family/:familyId', authenticateToken, (req, res) => {
  try {
    const { familyId } = req.params;

    if (req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chores = db.prepare('SELECT * FROM chores WHERE family_id = ?').all(familyId);
    res.json(chores);
  } catch (error) {
    console.error('Get chores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add chore (admin only)
router.post('/family/:familyId', authenticateToken, (req, res) => {
  try {
    const { familyId } = req.params;
    const { label } = req.body;

    if (req.user.type !== 'admin' || req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'Chore label required' });
    }

    const trimmedLabel = label.trim();

    // Check for duplicates (case-insensitive)
    const existing = db
      .prepare('SELECT * FROM chores WHERE family_id = ? AND LOWER(label) = LOWER(?)')
      .get(familyId, trimmedLabel);

    if (existing) {
      return res.status(409).json({ error: 'Chore with this label already exists' });
    }

    const choreId = trimmedLabel.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);

    db.prepare('INSERT INTO chores (id, family_id, label) VALUES (?, ?, ?)').run(
      choreId,
      familyId,
      trimmedLabel
    );

    const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId);
    res.status(201).json(chore);
  } catch (error) {
    console.error('Add chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update chore (admin only)
router.put('/:choreId', authenticateToken, (req, res) => {
  try {
    const { choreId } = req.params;
    const { label } = req.body;

    const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId);
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    if (req.user.type !== 'admin' || req.user.familyId !== chore.family_id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'Chore label required' });
    }

    const trimmedLabel = label.trim();

    // Check for duplicates (excluding current chore)
    const existing = db
      .prepare('SELECT * FROM chores WHERE family_id = ? AND LOWER(label) = LOWER(?) AND id != ?')
      .get(chore.family_id, trimmedLabel, choreId);

    if (existing) {
      return res.status(409).json({ error: 'Chore with this label already exists' });
    }

    db.prepare('UPDATE chores SET label = ? WHERE id = ?').run(trimmedLabel, choreId);

    const updated = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId);
    res.json(updated);
  } catch (error) {
    console.error('Update chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete chore (admin only)
router.delete('/:choreId', authenticateToken, (req, res) => {
  try {
    const { choreId } = req.params;

    const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId);
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    if (req.user.type !== 'admin' || req.user.familyId !== chore.family_id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    db.prepare('DELETE FROM chores WHERE id = ?').run(choreId);
    res.json({ message: 'Chore deleted successfully' });
  } catch (error) {
    console.error('Delete chore error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
