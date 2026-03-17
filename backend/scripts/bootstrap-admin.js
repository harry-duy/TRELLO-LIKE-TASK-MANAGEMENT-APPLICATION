const path = require('path');

const dotenvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });

const connectDB = require('../src/config/database');
const User = require('../src/models/user.model');

const bootstrapAdmin = async () => {
  await connectDB();

  const adminName = process.env.ADMIN_NAME || 'System Admin';
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required in backend/.env');
  }

  let user = await User.findOne({ email: adminEmail.toLowerCase() }).select('+password');

  if (!user) {
    user = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    });

    console.log('✅ Admin account created:', user.email);
  } else {
    let changed = false;

    if (user.role !== 'admin') {
      user.role = 'admin';
      changed = true;
    }

    if (!user.isActive) {
      user.isActive = true;
      changed = true;
    }

    if (process.env.ADMIN_FORCE_PASSWORD_RESET === 'true') {
      user.password = adminPassword;
      changed = true;
    }

    if (changed) {
      await user.save();
      console.log('✅ Existing user promoted/updated as admin:', user.email);
    } else {
      console.log('ℹ️ Admin account already configured:', user.email);
    }
  }
};

bootstrapAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Bootstrap admin failed:', error.message);
    process.exit(1);
  });
