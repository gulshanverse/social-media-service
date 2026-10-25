import 'reflect-metadata';
import { AdminRole } from '@prisma/client';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { hashPassword, prisma, recordAudit } from './admin-auth';

function prompt(question: string) {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise<string>((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

function hiddenPrompt(question: string) {
  if (!stdin.isTTY || !stdin.setRawMode)
    throw new Error('Password provisioning requires an interactive terminal.');
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise<string>((resolve) => {
    let value = '';
    const onData = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 3) {
          stdin.setRawMode?.(false);
          stdin.off('data', onData);
          stdout.write('\n');
          process.exit(130);
        }
        if (byte === 13 || byte === 10) {
          stdin.setRawMode?.(false);
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (byte === 127 || byte === 8) {
          value = value.slice(0, -1);
          continue;
        }
        if (byte >= 32 && byte <= 126) value += String.fromCharCode(byte);
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--allow-production'))
    throw new Error('Production provisioning requires the explicit --allow-production flag.');
  const email = (await prompt('Email: ')).toLowerCase();
  const name = await prompt('Name: ');
  const roleInput = (await prompt('Role [MODERATOR]: ')).toUpperCase() || 'MODERATOR';
  if (roleInput !== AdminRole.MODERATOR && roleInput !== AdminRole.DESIGNER)
    throw new Error('Role must be MODERATOR or DESIGNER.');
  const password = await hiddenPrompt('Password (hidden): ');
  if (!email || !name || password.length < 12)
    throw new Error('Email, name, and a 12-character password are required.');
  const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error('An administrator with that email already exists.');
  const admin = await prisma.adminUser.create({
    data: { email, name, role: roleInput as AdminRole, passwordHash: await hashPassword(password) },
    select: { id: true, email: true, name: true, role: true },
  });
  await recordAudit(undefined, 'ADMIN_USER_CREATED', 'ADMIN_USER', admin.id, {
    email: admin.email,
    name: admin.name,
    role: admin.role,
    source: 'provision-admin',
  });
  console.log(`Provisioned ${admin.role} administrator ${admin.email}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Provisioning failed.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
