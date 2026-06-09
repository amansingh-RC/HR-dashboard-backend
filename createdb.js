const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    user:     'postgres',
    password: 'Aman@2001',
    host:     'localhost',
    port:     5432,
    database: 'postgres', // Connect to default postgres DB first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    await client.query('CREATE DATABASE hr_dashboard');
    console.log('Database hr_dashboard created successfully');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Database hr_dashboard already exists');
    } else {
      console.error('Error:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

createDatabase();
