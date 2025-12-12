import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pkg from 'pg';
import crypto from 'crypto';
const { Pool } = pkg;

dotenv.config();

const [,, email, password, firstName, lastName] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/create-admin.js <email> <password> [firstName] [lastName]');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    const hashed = bcrypt.hashSync(password, 10);
    console.log('Generated password hash:', hashed);
    
    // First, ensure admin_users table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Check if user exists
    const res = await client.query('SELECT id, email FROM users WHERE email = $1', [email]);
    
    let userId;
    if (res.rowCount > 0) {
      // Update existing user's password
      userId = res.rows[0].id;
      await client.query(
        'UPDATE users SET password_hash = $1, first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name) WHERE email = $4',
        [hashed, firstName || null, lastName || null, email]
      );
      console.log('\n✅ Updated existing user:');
      console.log('   Email:', email);
      console.log('   User ID:', userId);
    } else {
      // Create new user with random ID
      userId = crypto.randomUUID();
      const insertRes = await client.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, email`,
        [userId, email, hashed, firstName || 'Admin', lastName || 'User']
      );
      console.log('\n✅ Created new user:');
      console.log('   ID:', insertRes.rows[0].id);
      console.log('   Email:', insertRes.rows[0].email);
    }
    
    // Add to admin_users table
    await client.query(
      `INSERT INTO admin_users (id, role, created_at)
       VALUES ($1, 'superadmin', NOW())
       ON CONFLICT (id) DO UPDATE SET role = 'superadmin'`,
      [userId]
    );
    console.log('   Admin Role: superadmin');
    
    console.log('\n🔑 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n🌐 Admin panel: http://localhost:3001');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to database. Check DATABASE_URL in .env');
    } else if (err.code === '42P01') {
      console.error('   Table "users" does not exist. Run migrations first.');
    }
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
