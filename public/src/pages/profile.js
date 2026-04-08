const {
  loadAppData: loadProfileData,
  updateAppData: updateProfileData,
} = window.FinanceStore;

const profileForm = document.getElementById("profile-form");
const profileMessage = document.getElementById("profile-message");
const photoInput = document.getElementById("foto");
const removePhotoButton = document.getElementById("remove-photo-button");
const photoPreview = document.getElementById("profile-photo-preview");

window.AppShell.initAppShell();

function showMessage(type, text) {
  profileMessage.textContent = text;
  profileMessage.className = `message-box ${type}`;
}

function getCurrentSessionUser() {
  return window.AuthSession.getAuthSession()?.user || {};
}

function fillProfileForm() {
  const data = loadProfileData();
  const sessionUser = getCurrentSessionUser();
  const profile = data.profile;

  document.getElementById("nome").value = profile.nome || sessionUser.nome || "";
  document.getElementById("email").value = profile.email || sessionUser.email || "";

  renderPhoto(profile.foto, profile.nome || sessionUser.nome || "");
}

function buildProfilePayload() {
  return {
    foto: loadProfileData().profile.foto || "",
    nome: document.getElementById("nome").value.trim(),
    email: document.getElementById("email").value.trim(),
  };
}

function persistProfile(successText, overridePhoto) {
  const profile = buildProfilePayload();

  updateProfileData((draft) => {
    draft.profile = {
      ...draft.profile,
      ...profile,
      foto:
        typeof overridePhoto === "string"
          ? overridePhoto
          : draft.profile.foto || profile.foto || "",
    };
    return draft;
  });

  const currentUser = getCurrentSessionUser();
  window.AuthSession.saveAuthSession({
    ...currentUser,
    nome: profile.nome || currentUser.nome || "Usuario",
    email: profile.email || currentUser.email || "",
  });

  window.AppShell.refreshAppShell();
  renderPhoto(loadProfileData().profile.foto, profile.nome || currentUser.nome || "");
  showMessage("success", successText);
}

function renderPhoto(photoValue, userName) {
  const initial = userName ? userName.charAt(0).toUpperCase() : "U";

  photoPreview.textContent = initial;
  photoPreview.style.backgroundImage = photoValue ? `url(${photoValue})` : "";
  photoPreview.classList.toggle("has-photo", Boolean(photoValue));
}

function handleSaveProfile(event) {
  event.preventDefault();
  persistProfile("Perfil salvo com sucesso.");
}

function handlePhotoChange() {
  const file = photoInput.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    persistProfile("Foto atualizada com sucesso.", String(reader.result || ""));
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  updateProfileData((draft) => {
    draft.profile.foto = "";
    return draft;
  });
  window.AppShell.refreshAppShell();
  renderPhoto("", document.getElementById("nome").value.trim());
  showMessage("success", "Foto removida do perfil.");
}

profileForm.addEventListener("submit", handleSaveProfile);
photoInput.addEventListener("change", handlePhotoChange);
removePhotoButton.addEventListener("click", removePhoto);
window.addEventListener("finance-data-updated", fillProfileForm);
window.FinanceStore.subscribe(() => {
  fillProfileForm();
});
window.addEventListener("storage", fillProfileForm);

fillProfileForm();
