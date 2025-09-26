const express = require('express');
const router = express.Router();
const { query, run, updateActualHours } = require('../database');

// GET /api/time-entries - Get time entries with filters
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, employee_id, project_id, limit = 100 } = req.query;
    
    let sql = `
      SELECT 
        te.*,
        e.name as employee_name,
        p.name as project_name,
        p.code as project_code
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      JOIN projects p ON te.project_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date) {
      sql += ' AND te.work_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      sql += ' AND te.work_date <= ?';
      params.push(end_date);
    }
    
    if (employee_id) {
      sql += ' AND te.employee_id = ?';
      params.push(employee_id);
    }
    
    if (project_id) {
      sql += ' AND te.project_id = ?';
      params.push(project_id);
    }
    
    sql += ' ORDER BY te.work_date DESC, e.name LIMIT ?';
    params.push(parseInt(limit));
    
    const timeEntries = await query(sql, params);
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// POST /api/time-entries - Create new time entry
router.post('/', async (req, res) => {
  try {
    const { employee_id, project_id, work_date, hours_worked, description } = req.body;
    
    if (!employee_id || !project_id || !work_date || !hours_worked) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (hours_worked <= 0 || hours_worked > 24) {
      return res.status(400).json({ error: 'Hours worked must be between 0 and 24' });
    }
    
    const sql = `
      INSERT INTO time_entries (employee_id, project_id, work_date, hours_worked, description)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await run(sql, [employee_id, project_id, work_date, hours_worked, description]);
    
    // Update actual hours in weekly planning
    await updateActualHours(employee_id, project_id, work_date);
    
    res.json({ 
      success: true, 
      id: result.id,
      message: 'Time entry created successfully' 
    });
  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

// PUT /api/time-entries/:id - Update time entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, project_id, work_date, hours_worked, description } = req.body;
    
    if (!employee_id || !project_id || !work_date || !hours_worked) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (hours_worked <= 0 || hours_worked > 24) {
      return res.status(400).json({ error: 'Hours worked must be between 0 and 24' });
    }
    
    // Get old entry for updating weekly planning
    const oldEntry = await query('SELECT * FROM time_entries WHERE id = ?', [id]);
    if (oldEntry.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    const sql = `
      UPDATE time_entries 
      SET employee_id = ?, project_id = ?, work_date = ?, hours_worked = ?, description = ?
      WHERE id = ?
    `;
    
    const result = await run(sql, [employee_id, project_id, work_date, hours_worked, description, id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    // Update actual hours for both old and new entries
    await updateActualHours(oldEntry[0].employee_id, oldEntry[0].project_id, oldEntry[0].work_date);
    if (employee_id !== oldEntry[0].employee_id || project_id !== oldEntry[0].project_id || work_date !== oldEntry[0].work_date) {
      await updateActualHours(employee_id, project_id, work_date);
    }
    
    res.json({ 
      success: true, 
      message: 'Time entry updated successfully' 
    });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

// DELETE /api/time-entries/:id - Delete time entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get entry before deleting for updating weekly planning
    const entry = await query('SELECT * FROM time_entries WHERE id = ?', [id]);
    if (entry.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    const result = await run('DELETE FROM time_entries WHERE id = ?', [id]);
    
    // Update actual hours in weekly planning
    await updateActualHours(entry[0].employee_id, entry[0].project_id, entry[0].work_date);
    
    res.json({ 
      success: true, 
      message: 'Time entry deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

// GET /api/time-entries/summary - Get time summary by employee/project
router.get('/summary', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'employee' } = req.query;
    
    let sql = '';
    const params = [];
    
    if (group_by === 'employee') {
      sql = `
        SELECT 
          e.id,
          e.name,
          e.position,
          SUM(te.hours_worked) as total_hours,
          COUNT(te.id) as total_entries,
          AVG(te.hours_worked) as avg_hours_per_entry
        FROM employees e
        LEFT JOIN time_entries te ON e.id = te.employee_id
      `;
    } else if (group_by === 'project') {
      sql = `
        SELECT 
          p.id,
          p.name,
          p.code,
          SUM(te.hours_worked) as total_hours,
          COUNT(te.id) as total_entries,
          COUNT(DISTINCT te.employee_id) as unique_employees
        FROM projects p
        LEFT JOIN time_entries te ON p.id = te.project_id
      `;
    } else {
      return res.status(400).json({ error: 'Invalid group_by parameter. Use "employee" or "project"' });
    }
    
    if (start_date || end_date) {
      sql += ' WHERE 1=1';
      if (start_date) {
        sql += ' AND te.work_date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        sql += ' AND te.work_date <= ?';
        params.push(end_date);
      }
    }
    
    sql += group_by === 'employee' ? ' GROUP BY e.id, e.name, e.position' : ' GROUP BY p.id, p.name, p.code';
    sql += ' ORDER BY total_hours DESC';
    
    const summary = await query(sql, params);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching time summary:', error);
    res.status(500).json({ error: 'Failed to fetch time summary' });
  }
});

module.exports = router;