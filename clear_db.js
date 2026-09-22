const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const envFile = fs.readFileSync('.env.local', 'utf-8');
const dbUrl = envFile.split('\n').find(line => line.startsWith('DATABASE_URL')).split('=')[1].trim().replace(/^"|"$/g, '');
process.env.DATABASE_URL = dbUrl;

const prisma = new PrismaClient();

async function main() {
    await prisma.resultSet.deleteMany({});
    console.log('Database cleared!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
