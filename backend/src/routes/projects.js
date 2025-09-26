const express = require('express');
const router = express.Router();
const { query, run } = require('../database');

// GET /api/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    const { status, active_only = false } = req.query;
    
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (active_only === 'true') {
      sql += ' AND status = \'active\'';
    }
    
    sql += ' ORDER BY name';
    
    const projects = await query(sql, params);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await query('SELECT * FROM projects WHERE id = ?', [id]);
    
    if (project.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const { name, code, status = 'active', start_date, end_date } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ error: 'Missing required fields: name, code' });
    }
    
    // Check if code already exists
    const existingProject = await query('SELECT id FROM projects WHERE code = ?', [code]);
    if (existingProject.length > 0) {
      return res.status(400).json({ error: 'Project with this code already exists' });
    }
    
    // Validate dates
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'Start date cannot be later than end date' });
    }
    
    const sql = `
      INSERT INTO projects (name, code, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await run(sql, [name, code, status, start_date, end_date]);
    
    res.status(201).json({ 
      success: true, 
      id: result.id,
      message: 'Project created successfully' 
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, status, start_date, end_date } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ error: 'Missing required fields: name, code' });
    }
    
    // Check if code already exists for other projects
    const existingProject = await query('SELECT id FROM projects WHERE code = ? AND id != ?', [code, id]);
    if (existingProject.length > 0) {
      return res.status(400).json({ error: 'Project with this code already exists' });
    }
    
    // Validate dates
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'Start date cannot be later than end date' });
    }
    
    const sql = `
      UPDATE projects 
      SET name = ?, code = ?, status = ?, start_date = ?, end_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    const result = await run(sql, [name, code, status, start_date, end_date, id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Project updated successfully' 
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Update project status to inactive
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await run('UPDATE projects SET status = \'inactive\', updated_at = datetime(\'now\') WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Project marked as inactive successfully' 
    });
  } catch (error) {
    console.error('Error deactivating project:', error);
    res.status(500).json({ error: 'Failed to deactivate project' });
  }
});

// GET /api/projects/:id/team - Get project team members
router.get('/:id/team', async (req, res) => {
  try {
    const { id } = req.params;
    const { week_start_date } = req.query;
    
    let sql = `
      SELECT DISTINCT
        e.id,
        e.name,
        e.position,
        e.email
      FROM employees e
      JOIN weekly_planning wp ON e.id = wp.employee_id
      WHERE wp.project_id = ?
    `;
    
    const params = [id];
    
    if (week_start_date) {
      sql += ' AND wp.week_start_date = ?';
      params.push(week_start_date);
    }
    
    sql += ' ORDER BY e.name';
    
    const team = await query(sql, params);
    res.json(team);
  } catch (error) {
    console.error('Error fetching project team:', error);
    res.status(500).json({ error: 'Failed to fetch project team' });
  }
});

// GET /api/projects/:id/planning - Get project planning data
router.get('/:id/planning', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    let sql = `
      SELECT 
        wp.*,
        e.name as employee_name,
        e.position
      FROM weekly_planning wp
      JOIN employees e ON wp.employee_id = e.id
      WHERE wp.project_id = ?
    `;
    
    const params = [id];
    
    if (start_date) {
      sql += ' AND wp.week_start_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      sql += ' AND wp.week_start_date <= ?';
      params.push(end_date);
    }
    
    sql += ' ORDER BY wp.week_start_date DESC, e.name';
    
    const planning = await query(sql, params);
    res.json(planning);
  } catch (error) {
    console.error('Error fetching project planning:', error);
    res.status(500).json({ error: 'Failed to fetch project planning' });
  }
});

// GET /api/projects/:id/time-entries - Get project time entries
router.get('/:id/time-entries', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, limit = 100 } = req.query;
    
    let sql = `
      SELECT 
        te.*,
        e.name as employee_name
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      WHERE te.project_id = ?
    `;
    
    const params = [id];
    
    if (start_date) {
      sql += ' AND te.work_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      sql += ' AND te.work_date <= ?';
      params.push(end_date);
    }
    
    sql += ' ORDER BY te.work_date DESC, e.name LIMIT ?';
    params.push(parseInt(limit));
    
    const timeEntries = await query(sql, params);
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching project time entries:', error);
    res.status(500).json({ error: 'Failed to fetch project time entries' });
  }
});

// GET /api/projects/:id/budget - Get project budget summary
router.get('/:id/budget', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    let sql = `
      SELECT 
        wp.*,
        e.name as employee_name
      FROM weekly_planning wp
      JOIN employees e ON wp.employee_id = e.id
      WHERE wp.project_id = ?
    `;
    
    const params = [id];
    
    if (start_date) {
      sql += ' AND wp.week_start_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      sql += ' AND wp.week_start_date <= ?';
      params.push(end_date);
    }
    
    const planning = await query(sql, params);
    
    let totalPlannedHours = 0;
    let totalActualHours = 0;
    let totalPlannedBudget = 0;
    let totalActualBudget = 0;
    
    const { getCurrentRate } = require('../database');
    
    for (let item of planning) {
      const rate = await getCurrentRate(item.employee_id, item.week_start_date);
      totalPlannedHours += item.planned_hours;
      totalActualHours += item.actual_hours;
      totalPlannedBudget += item.planned_hours * rate;
      totalActualBudget += item.actual_hours * rate;
    }
    
    res.json({
      project_id: id,
      period: { start_date, end_date },
      summary: {
        total_planned_hours: totalPlannedHours,
        total_actual_hours: totalActualHours,
        total_planned_budget: totalPlannedBudget,
        total_actual_budget: totalActualBudget,
        variance_hours: totalActualHours - totalPlannedHours,
        variance_budget: totalActualBudget - totalPlannedBudget,
        efficiency_ratio: totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching project budget:', error);
    res.status(500).json({ error: 'Failed to fetch project budget' });
  }
});

module.exports = router;