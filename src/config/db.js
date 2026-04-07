const mariadb = require("mariadb");
const USERS_TABLE = "usuarios";

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: 5,
  connectTimeout: 10000,
  ssl: {
    rejectUnauthorized: false,
  },
};

// Pool sem banco definido para conseguir criar o database, se necessario.
const adminPool = mariadb.createPool({
  ...dbConfig,
  connectionLimit: 2,
});

// Pool principal usado pela aplicacao.
const appPool = mariadb.createPool({
  ...dbConfig,
  database: process.env.DB_NAME,
});

let databaseReadyPromise;

async function initializeDatabase() {
  if (!databaseReadyPromise) {
    databaseReadyPromise = (async () => {
      let adminConnection;

      try {
        adminConnection = await adminPool.getConnection();
        await adminConnection.query(
          `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
        );
      } finally {
        if (adminConnection) {
          adminConnection.release();
        }
      }

      // Cria a tabela principal do sistema usando email como identificador unico.
      await runQuery(`
        CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
          id INT NOT NULL AUTO_INCREMENT,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          senha_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY unique_email (email)
        )
      `);

      // Ajusta a tabela caso ela ja exista com um formato antigo.
      const nomeColumn = await runQuery(
        `SHOW COLUMNS FROM ${USERS_TABLE} LIKE 'nome'`
      );

      if (nomeColumn.length === 0) {
        await runQuery(
          `ALTER TABLE ${USERS_TABLE} ADD COLUMN nome VARCHAR(255) NOT NULL DEFAULT 'Usuario' AFTER id`
        );
      }

      const createdAtColumn = await runQuery(
        `SHOW COLUMNS FROM ${USERS_TABLE} LIKE 'created_at'`
      );

      if (createdAtColumn.length === 0) {
        await runQuery(
          `ALTER TABLE ${USERS_TABLE} ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
        );
      }

      const emailColumn = await runQuery(
        `SHOW COLUMNS FROM ${USERS_TABLE} LIKE 'email'`
      );

      if (emailColumn.length > 0 && emailColumn[0].Null !== "NO") {
        await runQuery(
          `ALTER TABLE ${USERS_TABLE} MODIFY email VARCHAR(255) NOT NULL`
        );
      }

      const uniqueEmailIndex = await runQuery(
        `SHOW INDEX FROM ${USERS_TABLE} WHERE Key_name = 'unique_email'`
      );

      if (uniqueEmailIndex.length === 0) {
        await runQuery(
          `ALTER TABLE ${USERS_TABLE} ADD UNIQUE KEY unique_email (email)`
        );
      }

      // Se existir uma tabela antiga chamada "users", copia os registros aproveitaveis.
      const legacyUsersTable = await runQuery("SHOW TABLES LIKE 'users'");

      if (legacyUsersTable.length > 0) {
        const legacyNomeColumn = await runQuery("SHOW COLUMNS FROM users LIKE 'nome'");
        const legacyEmailColumn = await runQuery("SHOW COLUMNS FROM users LIKE 'email'");
        const legacySenhaColumn = await runQuery(
          "SHOW COLUMNS FROM users LIKE 'senha_hash'"
        );

        if (
          legacyNomeColumn.length > 0 &&
          legacyEmailColumn.length > 0 &&
          legacySenhaColumn.length > 0
        ) {
          await runQuery(`
            INSERT IGNORE INTO ${USERS_TABLE} (nome, email, senha_hash)
            SELECT nome, email, senha_hash
            FROM users
            WHERE email IS NOT NULL
          `);
        }
      }
    })().catch((error) => {
      databaseReadyPromise = null;
      throw error;
    });
  }

  return databaseReadyPromise;
}

async function runQuery(sql, params = []) {
  let connection;

  try {
    connection = await appPool.getConnection();
    return await connection.query(sql, params);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function closeDatabase() {
  await appPool.end();
  await adminPool.end();
}

module.exports = {
  closeDatabase,
  initializeDatabase,
  runQuery,
};
