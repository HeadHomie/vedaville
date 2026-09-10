(() => {
  const form = document.querySelector("#transformation-form");
  const fileInput = document.querySelector("#photos");
  const photoList = document.querySelector("#photo-list");
  const uploadZone = document.querySelector("#upload-zone");
  const message = document.querySelector("#form-message");
  const submitButton = form.querySelector("button[type='submit']");
  const buttonLabel = submitButton.querySelector(".button-label");
  const buttonLoading = submitButton.querySelector(".button-loading");
  const MAX_FILES = 4;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  let selectedFiles = [];

  function formatBytes(bytes) {
    return bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
    message.hidden = !text;
    if (text) message.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderFiles() {
    photoList.innerHTML = "";
    selectedFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "photo-item";
      const image = document.createElement("img");
      image.alt = "Selected photo preview";
      image.src = URL.createObjectURL(file);
      image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = file.name;
      const size = document.createElement("span");
      size.textContent = formatBytes(file.size);
      details.append(name, size);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        selectedFiles.splice(index, 1);
        renderFiles();
      });
      item.append(image, details, remove);
      photoList.append(item);
    });
  }

  function addFiles(files) {
    const incoming = [...files];
    const invalid = incoming.find(file => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE);
    if (invalid) {
      setMessage("Please choose JPG, PNG, or WebP photos that are 10 MB or smaller.", true);
      return;
    }
    const combined = [...selectedFiles, ...incoming];
    if (combined.length > MAX_FILES) {
      setMessage(`You can add up to ${MAX_FILES} photos.`, true);
      return;
    }
    selectedFiles = combined;
    fileInput.value = "";
    setMessage("");
    renderFiles();
  }

  fileInput.addEventListener("change", event => addFiles(event.target.files));
  ["dragenter", "dragover"].forEach(type => uploadZone.addEventListener(type, event => {
    event.preventDefault();
    uploadZone.classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach(type => uploadZone.addEventListener(type, event => {
    event.preventDefault();
    uploadZone.classList.remove("dragging");
  }));
  uploadZone.addEventListener("drop", event => addFiles(event.dataTransfer.files));

  function validateForm() {
    form.querySelectorAll("[aria-invalid='true']").forEach(field => field.removeAttribute("aria-invalid"));
    if (selectedFiles.length && !form.elements.photo_consent.checked) {
      form.elements.photo_consent.setCustomValidity("Photo permission is required when photos are included.");
    } else {
      form.elements.photo_consent.setCustomValidity("");
    }
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) {
        firstInvalid.setAttribute("aria-invalid", "true");
        firstInvalid.focus({ preventScroll: true });
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      form.reportValidity();
      return false;
    }
    return true;
  }

  async function jsonRequest(url, options) {
    const response = await fetch(url, {
      ...options,
      headers: { "content-type": "application/json", ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Something went wrong. Please try again.");
    return payload;
  }

  async function uploadPhotos(submission) {
    if (!selectedFiles.length) return [];
    const uploadPlan = await jsonRequest("/api/start-submission", {
      method: "POST",
      body: JSON.stringify({
        submission_id: submission.submission_id,
        files: selectedFiles.map(file => ({ name: file.name, type: file.type, size: file.size }))
      })
    });

    await Promise.all(uploadPlan.uploads.map(async (upload, index) => {
      const uploadBody = new FormData();
      uploadBody.append("cacheControl", "3600");
      uploadBody.append("", selectedFiles[index]);
      const response = await fetch(upload.signed_url, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: uploadBody
      });
      if (!response.ok) throw new Error(`We could not upload ${selectedFiles[index].name}. Please try again.`);
    }));
    return uploadPlan.uploads.map(item => ({ path: item.path, original_name: item.original_name }));
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!validateForm()) return;
    const data = new FormData(form);
    if (data.get("company_website")) return;
    const submissionId = crypto.randomUUID();
    submitButton.disabled = true;
    buttonLabel.hidden = true;
    buttonLoading.hidden = false;
    setMessage("");

    try {
      const photoPaths = await uploadPhotos({ submission_id: submissionId });
      const payload = Object.fromEntries(data.entries());
      delete payload.company_website;
      payload.submission_id = submissionId;
      payload.photo_paths = photoPaths;
      payload.story_consent = data.get("story_consent") === "true";
      payload.photo_consent = data.get("photo_consent") === "true";
      payload.truthfulness_confirmation = data.get("truthfulness_confirmation") === "true";
      payload.source_url = window.location.href;

      await jsonRequest("/api/submit-story", { method: "POST", body: JSON.stringify(payload) });
      form.reset();
      selectedFiles = [];
      renderFiles();
      setMessage("Thank you. Your story is safely with the Vedaville team. We will shape a draft and email it to you for approval before anything is published.");
    } catch (error) {
      setMessage(error.message || "We could not save your story. Please try again.", true);
    } finally {
      submitButton.disabled = false;
      buttonLabel.hidden = false;
      buttonLoading.hidden = true;
    }
  });
})();
