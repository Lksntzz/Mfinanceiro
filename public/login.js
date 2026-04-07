const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const messageBox = document.getElementById("message");

if (window.AuthSession.isAuthenticated()) {
  window.location.replace("/dashboard.html");
}

function showMessage(type, text) {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const payload = {
    email: formData.get("email"),
    senha: formData.get("senha"),
  };

  loginButton.disabled = true;
  loginButton.textContent = "Entrando...";

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel fazer login.");
    }

    // Guarda a sessao atual no navegador para liberar o acesso ao painel.
    window.AuthSession.saveAuthSession(data.user);

    showMessage(
      "success",
      `Login realizado com sucesso. Bem-vindo, ${data.user.nome}. Redirecionando para o dashboard...`
    );

    setTimeout(() => {
      window.location.href = "/dashboard.html";
    }, 1200);
  } catch (error) {
    showMessage("error", error.message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Entrar";
  }
});
