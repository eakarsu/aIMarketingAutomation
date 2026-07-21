import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const env = process.env;
if (env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
  throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
}
const email = String(env.PROVISION_ADMIN_EMAIL || env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(env.PROVISION_ADMIN_PASSWORD || env.ADMIN_PASSWORD || '');
const fullName = String(env.PROVISION_ADMIN_NAME || 'Runtime Acceptance').trim().split(/\s+/, 2);
if (!email || password.length < 12) throw new Error('Admin email and password of at least 12 characters are required');

async function main() {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: { password: passwordHash, role: 'ADMIN', emailVerified: true },
      create: {
        email, password: passwordHash, firstName: fullName[0] || 'Runtime',
        lastName: fullName[1] || 'Acceptance', role: 'ADMIN', emailVerified: true,
      },
    });
    console.log(`Provisioned marketing administrator for ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
