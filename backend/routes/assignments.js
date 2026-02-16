import express from 'express';
import { getDatabase } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// Get assignments for a family and week
router.get('/family/:familyId/week/:weekStartISO', authenticateToken, (req, res) => {
  try {
    const { familyId, weekStartISO } = req.params;

    if (req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignments = db
      .prepare('SELECT * FROM assignments WHERE family_id = ? AND week_start_iso = ?')
      .all(familyId, weekStartISO);

    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add assignment (admin only)
router.post('/family/:familyId', authenticateToken, (req, res) => {
  try {
    const { familyId } = req.params;
    const { personId, choreId, weekStartISO, dayIndex } = req.body;

    if (req.user.type !== 'admin' || req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!personId || !choreId || !weekStartISO || dayIndex === undefined) {
      return res.status(400).json({ error: 'personId, choreId, weekStartISO, and dayIndex required' });
    }

    // Verify person and chore belong to this family
    const person = db.prepare('SELECT * FROM people WHERE id = ? AND family_id = ?').get(personId, familyId);
    const chore = db.prepare('SELECT * FROM chores WHERE id = ? AND family_id = ?').get(choreId, familyId);

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    // Check if assignment already exists
    const existing = db
      .prepare(
        'SELECT * FROM assignments WHERE family_id = ? AND person_id = ? AND week_start_iso = ? AND day_index = ? AND chore_id = ?'
      )
      .get(familyId, personId, weekStartISO, dayIndex, choreId);

    if (existing) {
      return res.status(409).json({ error: 'Assignment already exists' });
    }

    const assignmentId = `${personId}-${weekStartISO}-${dayIndex}-${choreId}-${Date.now().toString(36)}`;

    db.prepare(
      'INSERT INTO assignments (id, family_id, person_id, chore_id, week_start_iso, day_index) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(assignmentId, familyId, personId, choreId, weekStartISO, dayIndex);

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Add assignment error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Assignment already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete assignment (admin only)
router.delete('/:assignmentId', authenticateToken, (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (req.user.type !== 'admin' || req.user.familyId !== assignment.family_id) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    db.prepare('DELETE FROM assignments WHERE id = ?').run(assignmentId);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add multiple assignments for a week (admin only)
router.post('/family/:familyId/week', authenticateToken, (req, res) => {
  try {
    const { familyId } = req.params;
    const { personId, choreId, weekStartISO } = req.body;

    if (req.user.type !== 'admin' || req.user.familyId !== familyId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!personId || !choreId || !weekStartISO) {
      return res.status(400).json({ error: 'personId, choreId, and weekStartISO required' });
    }

    // Verify person and chore belong to this family
    const person = db.prepare('SELECT * FROM people WHERE id = ? AND family_id = ?').get(personId, familyId);
    const chore = db.prepare('SELECT * FROM chores WHERE id = ? AND family_id = ?').get(choreId, familyId);

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    if (!chore) {
      return res.status(404).json({ error: 'Chore not found' });
    }

    const assignments = [];
    const insertAssignment = db.prepare(
      'INSERT INTO assignments (id, family_id, person_id, chore_id, week_start_iso, day_index) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      // Check if assignment already exists
      const existing = db
        .prepare(
          'SELECT * FROM assignments WHERE family_id = ? AND person_id = ? AND week_start_iso = ? AND day_index = ? AND chore_id = ?'
        )
        .get(familyId, personId, weekStartISO, dayIndex, choreId);

      if (!existing) {
        const assignmentId = `${personId}-${weekStartISO}-${dayIndex}-${choreId}-${Date.now().toString(36)}-${dayIndex}`;
        insertAssignment.run(assignmentId, familyId, personId, choreId, weekStartISO, dayIndex);
        const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
        assignments.push(assignment);
      }
    }

    res.status(201).json(assignments);
  } catch (error) {
    console.error('Add week assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
