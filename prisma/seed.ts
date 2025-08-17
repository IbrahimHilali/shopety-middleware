import * as bcrypt from 'bcrypt';
import {PrismaClient} from '@prisma/client'; // ✅ default Prisma import
import * as process from 'node:process';

const prisma = new PrismaClient();

async function main() {
    // Hash the default admin password
    const passwordHash = await bcrypt.hash(
        process.env.ADMIN_PASSWORD ?? 'admin',
        10
    );

    // Create admin user with role if not exists
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@admin.com';

    const existing = await prisma.user.findUnique({
        where: {email: adminEmail},
    });

    if (!existing) {
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: passwordHash, // ✅ match your schema field name
                roles: {
                    create: [
                        {name: 'admin'}, // must match the related model's fields
                    ],
                },
            },
            include: {roles: true},
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
