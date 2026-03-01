const bcrypt = require("bcryptjs");
const prisma = require("../prisma/prismaClient");

async function createUser() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: hashedPassword,
    },
  });

  console.log("✅ Admin user created");
  process.exit();
}

createUser();
