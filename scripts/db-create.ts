import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: +(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`,
  );
  console.log(`✅ Database ${process.env.DB_NAME} created`);
  await connection.end();
}

createDb().catch((err) => {
  console.error('❌ Error creating database', err);
  process.exit(1);
});
