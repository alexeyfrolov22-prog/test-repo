const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../resource_planning.db');
const db = new sqlite3.Database(dbPath);

// Database query helper with Promise wrapper
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Database insert/update helper
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Transaction helper
const transaction = async (callback) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      callback(db)
        .then(result => {
          db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve(result);
          });
        })
        .catch(error => {
          db.run('ROLLBACK', () => {
            reject(error);
          });
        });
    });
  });
};

// Get current rate for employee at specific date
const getCurrentRate = async (employeeId, date = new Date().toISOString().split('T')[0]) => {
  const sql = `
    SELECT rate_per_hour 
    FROM rate_history 
    WHERE employee_id = ? 
    AND effective_from <= ? 
    AND (effective_to IS NULL OR effective_to >= ?)
    ORDER BY effective_from DESC 
    LIMIT 1
  `;
  const result = await query(sql, [employeeId, date, date]);
  return result.length > 0 ? result[0].rate_per_hour : 0;
};

// Update actual hours in weekly planning based on time entries
const updateActualHours = async (employeeId, projectId, workDate) => {
  // Calculate week start (Monday)
  const date = new Date(workDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const weekStart = new Date(date.setDate(diff)).toISOString().split('T')[0];
  
  // Calculate total hours for the week
  const totalHoursSql = `
    SELECT COALESCE(SUM(hours_worked), 0) as total_hours
    FROM time_entries 
    WHERE employee_id = ? 
    AND project_id = ? 
    AND work_date >= ? 
    AND work_date < date(?, '+7 days')
  `;
  
  const totalResult = await query(totalHoursSql, [employeeId, projectId, weekStart, weekStart]);
  const totalHours = totalResult[0].total_hours;
  
  // Update weekly planning
  const updateSql = `
    UPDATE weekly_planning 
    SET actual_hours = ?, updated_at = datetime('now')
    WHERE employee_id = ? 
    AND project_id = ? 
    AND week_start_date = ?
  `;
  
  await run(updateSql, [totalHours, employeeId, projectId, weekStart]);
};

module.exports = {
  db,
  query,
  run,
  transaction,
  getCurrentRate,
  updateActualHours
};