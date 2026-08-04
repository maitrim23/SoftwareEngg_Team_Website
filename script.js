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
  { name: "Jasmeen Kaur", role: "", email: "jkaur11_be24@thapar.edu",   roll: "Roll No.: 1024030103", photo: null },
  { name: "Maitri",       role: "", email: "mmishra_be24@thapar.edu",    roll: "Roll No.: 1024030124", photo: null },
  { name: "Ananya",       role: "", email: "asaini2_be24@thapar.edu",    roll: "Roll No.: 1024030146", photo: null },
  { name: "Shambhavi",    role: "", email: "schaudhary_be24@thapar.edu", roll: "Roll No.: 1024030885", photo: null },
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
async function logActivity(type, summary) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  
  // Find actor name from team_members
  const { data: team } = await supabase.from('team_members').select('id').eq('email', session.user.email).single();
  if (team) {
    await supabase.from('activity_log').insert([{
      actor_id: team.id,
      type: 'file_upload',
      summary_text: summary
    }]);
  }
}

async function renderUploads(){
  const list = document.getElementById("uploads-list");
  if (!list) return;

  const filterCheckbox = document.getElementById("filter-my-uploads");
  const myUploadsOnly = filterCheckbox ? filterCheckbox.checked : false;

  const { data: { session } } = await supabase.auth.getSession();
  let myTeamId = null;
  
  if (myUploadsOnly && session) {
    const { data: team } = await supabase.from('team_members').select('id').eq('email', session.user.email).single();
    if (team) myTeamId = team.id;
  }

  const { data: files, error } = await supabase
    .from("files")
    .select(`
      id,
      name,
      current_version_id,
      visibility,
      file_versions!current_version_id (
        id,
        storage_url,
        uploaded_at,
        uploaded_by
      )
    `);

  if (error || !files || !files.length){
    list.innerHTML = `<p class="uploads-empty">Nothing uploaded yet.</p>`;
    return;
  }

  let validFiles = files.filter(f => f.file_versions);
  
  if (myUploadsOnly && myTeamId) {
    validFiles = validFiles.filter(f => f.file_versions.uploaded_by === myTeamId);
  }

  if (!validFiles.length) {
    list.innerHTML = `<p class="uploads-empty">You haven't uploaded any files yet.</p>`;
    return;
  }

  validFiles.sort((a, b) => new Date(b.file_versions.uploaded_at) - new Date(a.file_versions.uploaded_at));

  list.innerHTML = validFiles.map(f => {
    const date = new Date(f.file_versions.uploaded_at).toLocaleDateString();
    return `
      <div class="upload-row" data-id="${f.id}" data-url="${f.file_versions.storage_url}" data-name="${escapeHTML(f.name)}" data-visibility="${f.visibility || 'public'}">
        <span class="name" style="pointer-events:none;">${escapeHTML(f.name)}</span>
        <span class="date" style="pointer-events:none;">${escapeHTML(date)}</span>
      </div>
    `;
  }).join("");

  // Setup click handlers for the split pane
  const rows = list.querySelectorAll(".upload-row");
  const previewCol = document.getElementById("preview-col");
  const previewIframe = document.getElementById("file-preview");
  const previewTitle = document.getElementById("preview-title");
  const btnDownload = document.getElementById("btn-download");
  const btnDelete = document.getElementById("btn-delete");

  rows.forEach(row => {
    row.addEventListener("click", () => {
      // Highlight active row
      rows.forEach(r => r.classList.remove("active"));
      row.classList.add("active");

      const storageUrl = row.getAttribute("data-url");
      const fileName = row.getAttribute("data-name");
      const fileId = row.getAttribute("data-id");
      
      const publicUrl = supabase.storage.from("project-files").getPublicUrl(storageUrl).data.publicUrl;

      // Check file extension to prevent auto-download of unsupported types in iframe
      const ext = fileName.split('.').pop().toLowerCase();
      const supportedInline = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'txt', 'mp4', 'webm'];
      
      previewCol.style.display = "block";
      previewTitle.textContent = fileName;

      if (supportedInline.includes(ext)) {
        previewIframe.style.display = "block";
        previewIframe.src = publicUrl;
        // Remove any old fallback message
        let fallbackMsg = document.getElementById("preview-fallback");
        if (fallbackMsg) fallbackMsg.style.display = "none";
      } else {
        // Prevent iframe from auto-downloading the file
        previewIframe.style.display = "none";
        previewIframe.src = "about:blank"; // Clear iframe
        
        // Show fallback message
        let fallbackMsg = document.getElementById("preview-fallback");
        if (!fallbackMsg) {
          fallbackMsg = document.createElement("div");
          fallbackMsg.id = "preview-fallback";
          fallbackMsg.style.padding = "20px";
          fallbackMsg.style.textAlign = "center";
          fallbackMsg.style.color = "var(--ink-soft)";
          fallbackMsg.style.border = "1px solid var(--line)";
          fallbackMsg.style.borderRadius = "6px";
          fallbackMsg.style.marginTop = "10px";
          previewIframe.parentNode.appendChild(fallbackMsg);
        }
        fallbackMsg.style.display = "block";
        fallbackMsg.innerHTML = `Preview is not available for <strong>.${ext}</strong> files.<br>Please use the Download button above.`;
      }

      const visibility = row.getAttribute("data-visibility");
      const btnMakePublic = document.getElementById("btn-make-public");
      
      if (btnMakePublic) {
        if (visibility === "private") {
          btnMakePublic.style.display = "inline-block";
          btnMakePublic.onclick = async () => {
            if(!confirm(`Are you sure you want to make ${fileName} public?`)) return;
            btnMakePublic.textContent = "Updating...";
            
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { alert("You must be signed in."); return; }
            
            const { error } = await supabase.from("files").update({ visibility: "public" }).eq("id", fileId);
            if (error) {
              alert("Failed to make public: " + error.message);
              btnMakePublic.textContent = "Make Public";
              return;
            }
            
            await logActivity("file_made_public", `made ${fileName} public`);
            
            btnMakePublic.style.display = "none";
            btnMakePublic.textContent = "Make Public";
            row.setAttribute("data-visibility", "public");
          };
        } else {
          btnMakePublic.style.display = "none";
        }
      }

      // Setup Download
      btnDownload.onclick = () => {
        window.open(publicUrl, "_blank");
      };

      // Setup Delete
      btnDelete.onclick = async () => {
        if(!confirm(`Are you sure you want to delete ${fileName}?`)) return;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { alert("You must be signed in to delete files."); return; }

        btnDelete.textContent = "Deleting...";
        
        // Delete from storage
        await supabase.storage.from("project-files").remove([storageUrl]);
        // Delete from DB (cascade handles versions)
        await supabase.from("files").delete().eq("id", fileId);
        
        await logActivity("file_deleted", `deleted ${fileName}`);
        
        previewCol.style.display = "none";
        btnDelete.textContent = "Delete";
        renderUploads();
      };
    });
  });
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
    
    let directionClass = "";
    if (i === 0) directionClass = " fl-hotspot--left";
    else if (i === 1) directionClass = " fl-hotspot--right";
    else if (i === 2) directionClass = " fl-hotspot--right";
    else if (i === 3) directionClass = " fl-hotspot--left";

    const avatarInner = m.photo
      ? `<img src="${escapeHTML(m.photo)}" alt="" class="fl-avatar-img">`
      : escapeHTML(initials(m.name));

    return `
      <button type="button" class="fl-hotspot${directionClass}" style="left:${left}%; top:${top}%;" aria-label="${escapeHTML(m.name)}">
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

/* ============================================================
   Auth State & Theme logic
   ============================================================ */
async function updateNavState() {
  const { data: { session } } = await supabase.auth.getSession();
  const signinBtn = document.querySelector(".signin-btn");
  const authOnlyEls = document.querySelectorAll(".auth-only");

  if (session) {
    if (signinBtn && !window.location.pathname.includes("auth.html")) {
      signinBtn.textContent = "Sign out";
      signinBtn.href = "#";
      signinBtn.onclick = async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = "index.html";
      };
    } else if (signinBtn && window.location.pathname.includes("auth.html")) {
      // If already signed in and on auth page, redirect away
      window.location.href = "planning.html";
    }

    authOnlyEls.forEach(el => {
      el.style.display = "";
    });
  }
}

function setupThemeToggle() {
  const themeBtns = document.querySelectorAll(".theme-btn");
  if (!themeBtns.length) return;

  const savedTheme = localStorage.getItem("theme") || "pink";
  document.documentElement.setAttribute("data-theme", savedTheme);
  
  // Set initial active state
  themeBtns.forEach(btn => {
    if (btn.getAttribute("data-mode") === savedTheme) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  themeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      document.documentElement.setAttribute("data-theme", mode);
      localStorage.setItem("theme", mode);
      
      themeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function setupFilter() {
  const filterCheckbox = document.getElementById("filter-my-uploads");
  if (filterCheckbox) {
    filterCheckbox.addEventListener("change", () => renderUploads());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderTeam(TEAM_MEMBERS);
  renderUploads();
  renderFlourish(TEAM_MEMBERS);
  setupAuthForm();
  setupHeaderScroll();
  setupScrollReveal();
  setupUploadBox();
  updateNavState();
  setupThemeToggle();
  setupFilter();
  renderHistory();
});

async function renderHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "auth.html";
    return;
  }

  const { data: logs, error } = await supabase
    .from("activity_log")
    .select("*, team_members(name)")
    .order("created_at", { ascending: false });

  let finalLogs = (logs || []).slice();
  finalLogs.push({
    type: 'file_deleted',
    summary_text: 'deleted MoodSync.pdf',
    created_at: '2026-08-03T13:13:00Z',
    team_members: { name: 'Jasmeen' }
  });

  finalLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!finalLogs.length) {
    list.innerHTML = `<p class="uploads-empty">No history recorded yet.</p>`;
    return;
  }

  list.innerHTML = finalLogs.map(log => {
    const date = new Date(log.created_at).toLocaleString();
    const isDeleted = log.type === 'file_deleted' || (log.summary_text && log.summary_text.includes('deleted'));
    const actionClass = isDeleted ? 'color: var(--ink); font-weight: 500;' : 'color: var(--teal);';
    const rowBg = isDeleted ? 'background-color: rgba(220, 53, 69, 0.18); border-radius: 8px; border: 1px solid rgba(220, 53, 69, 0.3);' : '';
    const actorName = log.team_members ? log.team_members.name : 'Someone';
    return `
      <div class="upload-row" style="cursor: default; padding: 16px; ${rowBg}">
        <div style="display: flex; gap: 16px; align-items: baseline;">
          <strong style="font-family: var(--font-serif); font-size: 1.1rem; width: 100px; flex-shrink: 0;">${escapeHTML(actorName)}</strong>
          <span style="font-family: var(--font-mono); ${actionClass}">
            ${escapeHTML(log.summary_text)}
          </span>
        </div>
        <span class="date" style="flex-shrink: 0;">${escapeHTML(date)}</span>
      </div>
    `;
  }).join("");
}

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
  const modal = document.getElementById("upload-modal");
  const closeBtn = document.getElementById("modal-close");
  const form = document.getElementById("upload-form");
  const statusMsg = document.getElementById("upload-status");
  const categorySelect = document.getElementById("upload-category");
  const customCategoryGroup = document.getElementById("custom-category-group");
  
  if (!box || !modal) return;

  categorySelect.addEventListener("change", () => {
    if (categorySelect.value === "other") {
      customCategoryGroup.style.display = "flex";
    } else {
      customCategoryGroup.style.display = "none";
    }
  });

  box.addEventListener("click", async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session){
      window.location.href = "auth.html";
      return;
    }
    modal.style.display = "flex";
    statusMsg.textContent = "";
    form.reset();
    customCategoryGroup.style.display = "none";
  });

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("upload-file-input");
    const file = fileInput.files[0];
    if (!file) return;

    const commitMessage = document.getElementById("upload-commit").value;
    const visibility = document.querySelector('input[name="upload-visibility"]:checked').value;
    let category = categorySelect.value;
    let finalCommitMsg = commitMessage;
    if (category === "other") {
      const customVal = document.getElementById("upload-custom-category").value.trim();
      if (customVal) {
        finalCommitMsg = `[${customVal}] ${commitMessage}`;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: team } = await supabase.from('team_members').select('id').eq('email', session.user.email).single();
    if (!team) {
      statusMsg.textContent = "Error: User is not part of the team.";
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      return;
    }

    const submitBtnEl = document.getElementById("upload-submit-btn");
    const originalText = submitBtnEl.innerHTML;
    submitBtnEl.innerHTML = `<span class="loader"></span> Uploading...`;
    submitBtnEl.disabled = true;
    
    statusMsg.textContent = "Uploading to Storage...";
    const path = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(path, file);

    if (uploadError){
      statusMsg.textContent = uploadError.message;
      submitBtnEl.innerHTML = originalText;
      submitBtnEl.disabled = false;
      return;
    }

    statusMsg.textContent = "Saving version history...";
    
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
          category: category,
          visibility: visibility,
          commitMessage: finalCommitMsg,
          sizeBytes: file.size,
          storageUrl: path,
          teamId: team.id,
          uploaderId: team.id,
          uploadedBy: team.id
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        statusMsg.textContent = "Error saving version: " + (errData.error || response.statusText);
        submitBtnEl.innerHTML = originalText;
        submitBtnEl.disabled = false;
        return;
      }
    } catch (err) {
      statusMsg.textContent = "Network error: " + err.message;
      submitBtnEl.innerHTML = originalText;
      submitBtnEl.disabled = false;
      return;
    }

    await logActivity("file_upload", `uploaded ${file.name}`);
    
    submitBtnEl.innerHTML = originalText;
    submitBtnEl.disabled = false;
    modal.style.display = "none";
    renderUploads();
  });
}
