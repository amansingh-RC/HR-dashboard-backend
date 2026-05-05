require('dotenv').config();
const pool = require('./db');

async function clearData() {
  try {
    console.log('Connecting to database...');
    
    // Delete all attendance records first (due to foreign key constraints, if any)
    const attResult = await pool.query('DELETE FROM attendance');
    console.log(`✓ Deleted ${attResult.rowCount} attendance records`);
    
    // Delete all employees
    const empResult = await pool.query('DELETE FROM employees');
    console.log(`✓ Deleted ${empResult.rowCount} employees`);
    
    // Verify
    const empCount = await pool.query('SELECT COUNT(*) as count FROM employees');
    const attCount = await pool.query('SELECT COUNT(*) as count FROM attendance');
    
    console.log(`\n✓ Database cleared successfully!`);
    console.log(`  - Employees remaining: ${empCount.rows[0].count}`);
    console.log(`  - Attendance records remaining: ${attCount.rows[0].count}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
}

clearData();
