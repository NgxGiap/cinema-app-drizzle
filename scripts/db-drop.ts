import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function dropDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: +(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
  });

  await connection.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\`;`);
  console.log(`🗑️ Database ${process.env.DB_NAME} dropped`);
  await connection.end();
}

dropDb().catch((err) => {
  console.error('❌ Error dropping database', err);
  process.exit(1);
});
