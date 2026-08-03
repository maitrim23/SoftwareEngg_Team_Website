/* ============================================================
   Supabase client
   ============================================================
   Publishable key — safe to expose client-side. Auth (sign-in)
   and file uploads (Storage + the "files" table) both go through
   this client. See setupAuthForm() / renderUploads() / setupUploadBox()
   below for where it's used.
   ============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://eabcgxzlambjgbtmyemy.supabase.co',
  'sb_publishable_IXP3ww4hYvqeyL_UPpj-2w_kD41kmnI'
)

/* ============================================================
   ✏️  EDIT TEAM MEMBERS HERE  (shows on index.html)
   ============================================================
   Add, remove, or edit objects in this array. No HTML editing
   needed — "The team" list AND the hover-dot flourish both
   rebuild themselves from this.

   photo is optional — leave it null to show initials, or set it
   to an image path/URL (e.g. "photos/jasmeen.jpg") to show a
   real picture instead.

   Note: the flourish graphic only has 4 dots (one per petal), so
   only the first 4 members here get a hover dot. The team LIST
   below it has no such limit.
   ============================================================ */
const TEAM_MEMBERS = [
  { name: "Jasmeen Kaur", role: "", email: "jkaur11_be24@thapar.edu",   roll: "Roll No. — 1024030103", photo: null },
  { name: "Maitri",       role: "", email: "mmishra_be24@thapar.edu",    roll: "Roll No. — 1024030124", photo: null },
  { name: "Ananya",       role: "", email: "asaini2_be24@thapar.edu",    roll: "Roll No. — 1024030146", photo: null },
  { name: "Shambhavi",    role: "", email: "schaudhary_be24@thapar.edu", roll: "Roll No. — 1024030885", photo: null },
];

/* ============================================================
   Rendering — no need to edit below this line.
   ============================================================ */
function escapeHTML(str){
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderTeam(members){
  const list = document.getElementById("team-list");
  const count = document.getElementById("team-count");
  if (!list) return;

  if (count) count.textContent = `${members.length} MEMBER${members.length === 1 ? "" : "S"}`;

  list.innerHTML = members.map(m => `
    <div class="team-row">
      <h3 class="team-row-name">${escapeHTML(m.name)}</h3>
      <p class="team-row-meta">${escapeHTML(m.role)}<span class="sep">&middot;</span><span class="email">${escapeHTML(m.email)}</span></p>
    </div>
  `).join("");
}

/* ============================================================
   Uploaded files — now pulled live from Supabase (Storage bucket
   "project-files" + a "files" table with name/path/created_at
   columns) instead of the old static UPLOADED_FILES array.
   ============================================================ */
async function renderUploads(){
  const list = document.getElementById("uploads-list");
  if (!list) return;

  const { data: files, error } = await supabase
    .from("files")
    .select(`
      name,
      current_version_id,
      file_versions!current_version_id (
        storage_url,
        uploaded_at
      )
    `);

  if (error || !files || !files.length){
    list.innerHTML = `<p class="uploads-empty">Nothing uploaded yet.</p>`;
    return;
  }

  // Filter out any files that don't have versions yet or couldn't join
  const validFiles = files.filter(f => f.file_versions);

  // Sort by uploaded_at descending
  validFiles.sort((a, b) => new Date(b.file_versions.uploaded_at) - new Date(a.file_versions.uploaded_at));

  list.innerHTML = validFiles.map(f => {
    const url = supabase.storage.from("project-files").getPublicUrl(f.file_versions.storage_url).data.publicUrl;
    const date = new Date(f.file_versions.uploaded_at).toLocaleDateString();
    return `
      <div class="upload-row">
        <a href="${url}" target="_blank" class="name">${escapeHTML(f.name)}</a>
        <span class="date">${escapeHTML(date)}</span>
      </div>
    `;
  }).join("");
}

/* Fixed positions of the 4 petal tips in the flourish SVG's
   340x300 viewBox — matched in order to TEAM_MEMBERS[0..3]. */
const FLOURISH_NODES = [
  { x: 190, y: 29  },  // top
  { x: 292, y: 105 },  // right
  { x: 267, y: 236 },  // bottom-right
  { x: 86,  y: 221 },  // bottom-left
];

function initials(name){
  return String(name).trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function renderFlourish(members){
  const container = document.getElementById("fl-hotspots");
  if (!container) return;

  container.innerHTML = members.slice(0, FLOURISH_NODES.length).map((m, i) => {
    const pos = FLOURISH_NODES[i];
    const left = (pos.x / 340 * 100).toFixed(2);
    const top = (pos.y / 300 * 100).toFixed(2);
    const flip = top < 20 ? " fl-hotspot--flip" : "";
    const avatarInner = m.photo
      ? `<img src="${escapeHTML(m.photo)}" alt="" class="fl-avatar-img">`
      : escapeHTML(initials(m.name));

    return `
      <button type="button" class="fl-hotspot${flip}" style="left:${left}%; top:${top}%;" aria-label="${escapeHTML(m.name)}">
        <span class="fl-dot"></span>
        <span class="fl-card">
          <span class="fl-avatar">${avatarInner}</span>
          <span class="fl-card-name">${escapeHTML(m.name)}</span>
          <span class="fl-card-roll">${escapeHTML(m.roll || "")}</span>
        </span>
      </button>
    `;
  }).join("");
}

/* ============================================================
   Header shadow on scroll — purely cosmetic, adds depth once the
   page has scrolled past the very top.
   ============================================================ */
function setupHeaderScroll(){
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ============================================================
   Scroll-reveal — fades/slides ".reveal" elements in as they
   enter the viewport. Respects prefers-reduced-motion by simply
   not needing JS at all (the CSS transition duration collapses).
   ============================================================ */
function setupScrollReveal(){
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)){
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  targets.forEach(el => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  renderTeam(TEAM_MEMBERS);
  renderUploads();
  renderFlourish(TEAM_MEMBERS);
  setupAuthForm();
  setupHeaderScroll();
  setupScrollReveal();
  setupUploadBox();
});

/* ============================================================
   Team sign-in form (auth.html)
   ============================================================
   Real Supabase auth — signs the user in with email + password
   against your Supabase project's Auth users, then redirects to
   planning.html on success.
   ============================================================ */
function setupAuthForm(){
  const authForm = document.getElementById("auth-form");
  const message = document.getElementById("auth-message");
  if (!authForm) return;

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authForm.email.value.trim();
    const password = authForm.password.value;

    if (!email || !password){
      message.textContent = "Enter your email and password to continue.";
      return;
    }

    message.textContent = "Signing in…";
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error){
      message.textContent = error.message;
      return;
    }

    message.textContent = "Signed in — redirecting…";
    window.location.href = "planning.html";
  });
}

/* ============================================================
   Upload button (planning.html)
   ============================================================
   If nobody's signed in, sends them to auth.html first. If they
   are signed in, opens a native file picker, uploads the chosen
   file to the "project-files" Storage bucket, records it in the
   "files" table, then re-renders the uploads list.
   ============================================================ */
function setupUploadBox(){
  const box = document.querySelector(".signin-upload-box");
  if (!box) return;

  box.addEventListener("click", async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session){
      window.location.href = "auth.html";
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      
      const commitMessage = prompt("Enter a commit message for this upload:", "Uploaded " + file.name);
      if (!commitMessage) return;

      const path = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(path, file);

      if (uploadError){
        alert(uploadError.message);
        return;
      }

      // Call the Edge Function for file versioning
      try {
        const response = await fetch("https://eabcgxzlambjgbtmyemy.supabase.co/functions/v1/upload-file", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileName: file.name,
            category: "other",
            visibility: "public",
            commitMessage: commitMessage,
            sizeBytes: file.size,
            storageUrl: path
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          alert("Error saving version: " + (errData.error || response.statusText));
          return;
        }
      } catch (err) {
        alert("Network error calling edge function: " + err.message);
        return;
      }

      renderUploads();
    };
    input.click();
  });
}
