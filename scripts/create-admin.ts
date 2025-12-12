// Script to generate hashed password for admin user
import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10).then(hash => {
  console.log('\nGenerated password hash:');
  console.log(hash);
  console.log('\nUse this SQL to create an admin user:');
  console.log(`
INSERT INTO users (username, email, password, role, banned, created_at) 
VALUES ('admin', 'admin@movo.com', '${hash}', 'superadmin', false, NOW());
  `);
  console.log('\nPassword:', password);
}).catch(err => {
  console.error('Error:', err);
});
