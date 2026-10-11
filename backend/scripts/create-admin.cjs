const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (
    !email ||
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  )
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in the server environment.',
    );
  if (await prisma.user.findUnique({ where: { email } }))
    throw new Error('Account already exists; no credentials were changed.');
  await prisma.user.create({
    data: {
      email,
      name: process.env.ADMIN_NAME || 'Administrador',
      passwordHash: await hash(password, 12),
      role: 'admin',
    },
  });
  console.log(
    'Administrator created. Remove ADMIN_PASSWORD from the environment.',
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
