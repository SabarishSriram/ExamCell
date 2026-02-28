const bcrypt = require("bcryptjs");
const prisma = require("../prisma/prismaClient");

async function main() {
  const email = "admin@srmist.edu.in";
  const password = "admin@1234";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash } });
  console.log(`Admin user created: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
