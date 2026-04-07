const authService = require("../services/authService");

async function register(req, res, next) {
  try {
    const { nome, email, senha } = req.body ?? {};

    if (!nome || !email || !senha) {
      return res.status(400).json({
        error: "nome, email e senha sao obrigatorios",
      });
    }

    const user = await authService.registerUser({ nome, email, senha });

    return res.status(201).json({
      message: "usuario registrado com sucesso",
      user,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, senha } = req.body ?? {};

    if (!email || !senha) {
      return res.status(400).json({
        error: "email e senha sao obrigatorios",
      });
    }

    const user = await authService.loginUser({ email, senha });

    return res.json({
      message: "login realizado com sucesso",
      user,
    });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({
        error: "email e obrigatorio",
      });
    }

    const resetData = await authService.generatePasswordResetToken(email);

    return res.json({
      message:
        "token de redefinicao gerado com sucesso; em uma aplicacao real, ele seria enviado por email",
      email: resetData.email,
      resetToken: resetData.token,
      expiresAt: resetData.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
};
