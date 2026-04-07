const registerForm = document.getElementById("register-form");
const registerButton = document.getElementById("register-button");
const messageBox = document.getElementById("message");

if (window.AuthSession.isAuthenticated()) {
  window.location.replace("/dashboard.html");
}

function showMessage(type, text) {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(registerForm);
  const payload = {
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  };

  registerButton.disabled = true;
  registerButton.textContent = "Cadastrando...";

  try {
    const response = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel concluir o cadastro.");
    }

    showMessage(
      "success",
      "Cadastro concluido com sucesso. Agora faca login para acessar o painel."
    );
    registerForm.reset();

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1400);
  } catch (error) {
    showMessage("error", error.message);
  } finally {
    registerButton.disabled = false;
    registerButton.textContent = "Cadastrar";
  }
});
