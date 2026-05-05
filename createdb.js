const { Client } = require('pg');

const client = new Client({
  user:     'postgres',
  password: 'Aman@2001',
  host:     'localhost',
  port:     5432,
  database: 'postgres'  // Connect to default postgres DB first
});

client.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    return client.query('CREATE DATABASE hr_dashboard');
  })
  .then(() => {
    console.log('Database hr_dashboard created successfully');
    return client.end();
  })
  .catch(err => {
    if (err.message.includes('already exists')) {
      console.log('Database hr_dashboard already exists');
      return client.end();
    }
    console.error('Error:', err.message);
    process.exit(1);
  });
