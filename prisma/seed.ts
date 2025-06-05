import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface UserData {
  email: string;
  balance: number;
}

// Default password for all seeded users (meets validation requirements)
const DEFAULT_PASSWORD = 'Password123!';

function loadUsersFromJson(): UserData[] {
  const filePath = path.join(__dirname, 'resources', 'users.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent) as UserData[];
}

async function main() {
  console.log('Starting seed...');

  const users = loadUsersFromJson();
  console.log(`Found ${users.length} users to create`);

  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users and wallets...');

  let successCount = 0;

  for (const userData of users) {
    try {
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

      await prisma.$transaction(async (prisma) => {
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
          },
        });

        await prisma.wallet.create({
          data: {
            balance: 0,
            userId: user.id,
          },
        });
      });

      successCount++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to create user ${userData.email}: ${errorMessage}`);
    }
  }

  console.log(`Seed completed. Created ${successCount} users with wallets.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
