require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const authRoutes = require("./src/routes/authRoutes");
const { initializeDatabase } = require("./src/config/db");

const app = express();
const port = Number(process.env.PORT || 3000);
const distDir = path.join(__dirname, "dist");
const publicDir = path.join(__dirname, "public");
const frontendDir = fs.existsSync(path.join(distDir, "index.html")) ? distDir : publicDir;

// Faz o Express entender JSON no corpo das requisicoes.
app.use(express.json());

// Evita que o navegador reutilize HTML, CSS e JS antigos enquanto o app ainda esta evoluindo.
app.use((req, res, next) => {
  if (/\.(html|css|js)$/i.test(req.path)) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
});

// Em producao serve o frontend buildado pelo Vite; em fallback usa os arquivos estaticos.
app.use(express.static(frontendDir));

// Rota simples para verificar se a API esta no ar.
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

// Importa e registra as rotas de autenticacao.
app.use("/", authRoutes);

// Resposta padrao para rotas que nao existem.
app.use((req, res) => {
  res.status(404).json({
    error: "rota nao encontrada",
  });
});

// Tratamento centralizado de erros.
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: error.message || "erro interno do servidor",
  });
});

// Inicia o servidor somente depois de garantir que o banco esta pronto.
initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Falha ao iniciar a aplicacao:", error.message);
    process.exit(1);
  });
