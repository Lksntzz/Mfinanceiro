const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

// Rotas de autenticacao.
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/esqueci-senha", authController.forgotPassword);

module.exports = router;
