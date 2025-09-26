const express = require('express');
const router = express.Router();
const { query, run, getCurrentRate } = require('../database');

// GET /api/planning/:week - Get planning for specific week
router.get('/:week', async (req, res) => {
  try {
    const { week } = req.params;
    
    const sql = `
      SELECT 
        wp.id,
        wp.employee_id,
        wp.project_id,
        wp.week_start_date,
        wp.planned_hours,
        wp.actual_hours,
        e.name as employee_name,
        e.position,
        p.name as project_name,
        p.code as project_code
      FROM weekly_planning wp
      JOIN employees e ON wp.employee_id = e.id
      JOIN projects p ON wp.project_id = p.id
      WHERE wp.week_start_date = ?
      ORDER BY e.name, p.name
    `;
    
    const planning = await query(sql, [week]);
    
    // Add current rates and budget calculations
    for (let item of planning) {
      const rate = await getCurrentRate(item.employee_id, item.week_start_date);
      item.current_rate = rate;
      item.planned_budget = item.planned_hours * rate;
      item.actual_budget = item.actual_hours * rate;
      item.variance_hours = item.actual_hours - item.planned_hours;
      item.variance_budget = item.actual_budget - item.planned_budget;
    }
    
    res.json(planning);
  } catch (error) {
    console.error('Error fetching planning:', error);
    res.status(500).json({ error: 'Failed to fetch planning data' });
  }
});

// POST /api/planning - Create or update planning entry
router.post('/', async (req, res) => {
  try {
    const { employee_id, project_id, week_start_date, planned_hours, created_by_manager_id } = req.body;
    
    if (!employee_id || !project_id || !week_start_date || planned_hours === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const sql = `
      INSERT INTO weekly_planning (employee_id, project_id, week_start_date, planned_hours, created_by_manager_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(employee_id, project_id, week_start_date) 
      DO UPDATE SET 
        planned_hours = excluded.planned_hours,
        updated_at = datetime('now')
    `;
    
    const result = await run(sql, [employee_id, project_id, week_start_date, planned_hours, created_by_manager_id]);
    
    res.json({ 
      success: true, 
      id: result.id,
      message: 'Planning entry created/updated successfully' 
    });
  } catch (error) {
    console.error('Error creating/updating planning:', error);
    res.status(500).json({ error: 'Failed to create/update planning entry' });
  }
});

// GET /api/planning/:week/budget - Get budget summary for week
router.get('/:week/budget', async (req, res) => {
  try {
    const { week } = req.params;
    
    const sql = `
      SELECT 
        wp.*,
        e.name as employee_name,
        p.name as project_name
      FROM weekly_planning wp
      JOIN employees e ON wp.employee_id = e.id
      JOIN projects p ON wp.project_id = p.id
      WHERE wp.week_start_date = ?
    `;
    
    const planning = await query(sql, [week]);
    
    let totalPlannedBudget = 0;
    let totalActualBudget = 0;
    let totalPlannedHours = 0;
    let totalActualHours = 0;
    
    const budgetDetails = [];
    
    for (let item of planning) {
      const rate = await getCurrentRate(item.employee_id, item.week_start_date);
      const plannedBudget = item.planned_hours * rate;
      const actualBudget = item.actual_hours * rate;
      
      totalPlannedBudget += plannedBudget;
      totalActualBudget += actualBudget;
      totalPlannedHours += item.planned_hours;
      totalActualHours += item.actual_hours;
      
      budgetDetails.push({
        ...item,
        rate,
        planned_budget: plannedBudget,
        actual_budget: actualBudget,
        variance_budget: actualBudget - plannedBudget
      });
    }
    
    res.json({
      week_start_date: week,
      summary: {
        total_planned_hours: totalPlannedHours,
        total_actual_hours: totalActualHours,
        total_planned_budget: totalPlannedBudget,
        total_actual_budget: totalActualBudget,
        variance_hours: totalActualHours - totalPlannedHours,
        variance_budget: totalActualBudget - totalPlannedBudget
      },
      details: budgetDetails
    });
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget data' });
  }
});

// DELETE /api/planning/:id - Delete planning entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await run('DELETE FROM weekly_planning WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Planning entry not found' });
    }
    
    res.json({ success: true, message: 'Planning entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting planning:', error);
    res.status(500).json({ error: 'Failed to delete planning entry' });
  }
});

module.exports = router;