#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function initAdmin() {
  try {
    const adminEmail = "C109193108@nkust.edu.tw";

    console.log(`Setting ${adminEmail} as admin...`);

    const result = await prisma.user.updateMany({
      where: { email: adminEmail },
      data: { role: "ADMIN" }
    });

    if (result.count === 0) {
      console.log(`⚠️  User ${adminEmail} not found. They need to sign in first.`);
      console.log("   The user will be set as admin when they create an account.");
    } else {
      console.log(`✓ Successfully set ${adminEmail} as ADMIN (${result.count} user updated)`);
    }

    // Also ensure the user is not banned
    await prisma.user.updateMany({
      where: { email: adminEmail },
      data: { bannedAt: null }
    });

  } catch (error) {
    console.error("Error initializing admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initAdmin();
