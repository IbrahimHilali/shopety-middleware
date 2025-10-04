import { PrismaClient } from '@prisma/client'; // ✅ default Prisma import
import * as process from 'node:process';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Hash the default admin password
  const passwordHash = await argon2.hash(
    process.env.ADMIN_PASSWORD ?? 'Ibra122195$',
  );

  // Create admin user with role if not exists
  const adminEmail = process.env.ADMIN_EMAIL ?? 'i.private@zohomail.eu';

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: passwordHash, // ✅ match your schema field name
        roles: {
          create: [
            { name: 'admin' }, // must match the related model's fields
          ],
        },
      },
      include: { roles: true },
    });

    console.log('✅ Admin user created:', admin);
  } else {
    console.log('ℹ️ Admin user already exists, skipping seed.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
