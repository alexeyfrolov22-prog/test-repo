const express = require('express');
const router = express.Router();
const { query, run } = require('../database');

// GET /api/employees - Get all employees
router.get('/', async (req, res) => {
  try {
    const { active_only = true } = req.query;
    
    let sql = 'SELECT * FROM employees';
    const params = [];
    
    if (active_only === 'true') {
      sql += ' WHERE is_active = 1';
    }
    
    sql += ' ORDER BY name';
    
    const employees = await query(sql, params);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await query('SELECT * FROM employees WHERE id = ?', [id]);
    
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(employee[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST /api/employees - Create new employee
router.post('/', async (req, res) => {
  try {
    const { name, email, position, is_active = true } = req.body;
    
    if (!name || !email || !position) {
      return res.status(400).json({ error: 'Missing required fields: name, email, position' });
    }
    
    // Check if email already exists
    const existingEmployee = await query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existingEmployee.length > 0) {
      return res.status(400).json({ error: 'Employee with this email already exists' });
    }
    
    const sql = `
      INSERT INTO employees (name, email, position, is_active)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await run(sql, [name, email, position, is_active]);
    
    res.status(201).json({ 
      success: true, 
      id: result.id,
      message: 'Employee created successfully' 
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, position, is_active } = req.body;
    
    if (!name || !email || !position) {
      return res.status(400).json({ error: 'Missing required fields: name, email, position' });
    }
    
    // Check if email already exists for other employees
    const existingEmployee = await query('SELECT id FROM employees WHERE email = ? AND id != ?', [email, id]);
    if (existingEmployee.length > 0) {
      return res.status(400).json({ error: 'Employee with this email already exists' });
    }
    
    const sql = `
      UPDATE employees 
      SET name = ?, email = ?, position = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    
    const result = await run(sql, [name, email, position, is_active, id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Employee updated successfully' 
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id - Soft delete employee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await run('UPDATE employees SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Employee deactivated successfully' 
    });
  } catch (error) {
    console.error('Error deactivating employee:', error);
    res.status(500).json({ error: 'Failed to deactivate employee' });
  }
});

// GET /api/employees/:id/rates - Get rate history for employee
router.get('/:id/rates', async (req, res) => {
  try {
    const { id } = req.params;
    
    const rates = await query(`
      SELECT * FROM rate_history 
      WHERE employee_id = ? 
      ORDER BY effective_from DESC
    `, [id]);
    
    res.json(rates);
  } catch (error) {
    console.error('Error fetching employee rates:', error);
    res.status(500).json({ error: 'Failed to fetch employee rates' });
  }
});

// POST /api/employees/:id/rates - Add new rate for employee
router.post('/:id/rates', async (req, res) => {
  try {
    const { id } = req.params;
    const { rate_per_hour, effective_from, effective_to } = req.body;
    
    if (!rate_per_hour || !effective_from) {
      return res.status(400).json({ error: 'Missing required fields: rate_per_hour, effective_from' });
    }
    
    if (rate_per_hour <= 0) {
      return res.status(400).json({ error: 'Rate per hour must be greater than 0' });
    }
    
    // Check if employee exists
    const employee = await query('SELECT id FROM employees WHERE id = ?', [id]);
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // End current rate if no end date specified
    if (!effective_to) {
      await run(`
        UPDATE rate_history 
        SET effective_to = date(?, '-1 day') 
        WHERE employee_id = ? AND effective_to IS NULL
      `, [effective_from, id]);
    }
    
    const sql = `
      INSERT INTO rate_history (employee_id, rate_per_hour, effective_from, effective_to)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await run(sql, [id, rate_per_hour, effective_from, effective_to]);
    
    res.status(201).json({ 
      success: true, 
      id: result.id,
      message: 'Rate added successfully' 
    });
  } catch (error) {
    console.error('Error adding employee rate:', error);
    res.status(500).json({ error: 'Failed to add employee rate' });
  }
});

// GET /api/employees/:id/workload - Get employee workload summary
router.get('/:id/workload', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    let sql = `
      SELECT 
        wp.week_start_date,
        SUM(wp.planned_hours) as total_planned_hours,
        SUM(wp.actual_hours) as total_actual_hours,
        COUNT(wp.project_id) as project_count
      FROM weekly_planning wp
      WHERE wp.employee_id = ?
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
    
    sql += ' GROUP BY wp.week_start_date ORDER BY wp.week_start_date DESC';
    
    const workload = await query(sql, params);
    res.json(workload);
  } catch (error) {
    console.error('Error fetching employee workload:', error);
    res.status(500).json({ error: 'Failed to fetch employee workload' });
  }
});

module.exports = router;