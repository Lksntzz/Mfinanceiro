const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { runQuery } = require("../config/db");

const SALT_ROUNDS = 10;

function createAppError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : null;
}

function normalizeName(nome) {
  return nome ? nome.trim() : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const rows = await runQuery(
    "SELECT id, nome, email, senha_hash, created_at FROM usuarios WHERE email = ? LIMIT 1",
    [normalizedEmail]
  );

  return rows[0] || null;
}

async function registerUser({ nome, email, senha }) {
  const normalizedName = normalizeName(nome);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedName) {
    throw createAppError("nome invalido", 400);
  }

  if (!isValidEmail(normalizedEmail)) {
    throw createAppError("email invalido", 400);
  }

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw createAppError("email ja cadastrado", 409);
  }

  const passwordHash = await bcrypt.hash(senha, SALT_ROUNDS);

  try {
    await runQuery(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
      [normalizedName, normalizedEmail, passwordHash]
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createAppError("email ja cadastrado", 409);
    }

    throw createAppError("erro ao salvar usuario no banco", 500);
  }

  return {
    nome: normalizedName,
    email: normalizedEmail,
  };
}

async function loginUser({ email, senha }) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw createAppError("email invalido", 400);
  }

  let user;

  try {
    user = await findUserByEmail(normalizedEmail);
  } catch (error) {
    throw createAppError("erro ao buscar usuario no banco", 500);
  }

  if (!user) {
    throw createAppError("credenciais invalidas", 401);
  }

  const passwordMatches = await bcrypt.compare(senha, user.senha_hash);

  if (!passwordMatches) {
    throw createAppError("credenciais invalidas", 401);
  }

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
  };
}

async function generatePasswordResetToken(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw createAppError("email invalido", 400);
  }

  let user;

  try {
    user = await findUserByEmail(normalizedEmail);
  } catch (error) {
    throw createAppError("erro ao buscar usuario no banco", 500);
  }

  if (!user) {
    throw createAppError("email nao encontrado", 404);
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return {
    email: normalizedEmail,
    token,
    expiresAt,
  };
}

module.exports = {
  findUserByEmail,
  generatePasswordResetToken,
  loginUser,
  registerUser,
};
