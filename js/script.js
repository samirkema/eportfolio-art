(function () {
  const yearsContainer = document.getElementById("years");

  fetch("assets/data.json", { cache: "no-store" })
    .then((r) => r.json())
    .then(render)
    .catch((err) => {
      yearsContainer.innerHTML = `<p style="text-align:center;color:#a33;">Could not load the content (${err.message}).</p>`;
    });

  function render(years) {
    years.forEach((yearBlock) => {
      const section = document.createElement("section");
      section.className = "year-section";

      const heading = document.createElement("div");
      heading.className = "year-heading";
      heading.innerHTML = `<h2>${yearBlock.year}</h2><div class="rule"></div>`;
      section.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "project-grid";

      yearBlock.projects.forEach((project) => {
        grid.appendChild(renderCard(project));
      });

      section.appendChild(grid);
      yearsContainer.appendChild(section);
    });
  }

  function renderCard(project) {
    const card = document.createElement("button");
    card.className = "project-card";
    card.type = "button";

    const thumb = document.createElement("div");
    thumb.className = "project-thumb";

    if (project.vignetteType === "video") {
      const video = document.createElement("video");
      video.src = project.vignette;
      video.muted = true;
      video.playsInline = true;
      thumb.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = project.vignette;
      img.alt = project.title;
      img.loading = "lazy";
      thumb.appendChild(img);
    }

    const caption = document.createElement("div");
    caption.className = "project-caption";
    caption.innerHTML = `<h3>${project.title}</h3><p>${project.category}</p>`;

    card.appendChild(thumb);
    card.appendChild(caption);

    card.addEventListener("click", () => openLightbox(project));

    return card;
  }

  // Lightbox
  const lightbox = document.getElementById("lightbox");
  const lightboxMedia = document.getElementById("lightbox-media");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxMeta = document.getElementById("lightbox-meta");
  const lightboxDescription = document.getElementById("lightbox-description");
  const btnClose = document.getElementById("lightbox-close");
  const btnPrev = document.getElementById("lightbox-prev");
  const btnNext = document.getElementById("lightbox-next");

  let currentProject = null;
  let currentIndex = 0;

  function galleryFor(project) {
    return [
      { src: project.vignette, type: project.vignetteType },
      ...(project.gallery || []),
    ];
  }

  function openLightbox(project) {
    currentProject = project;
    currentIndex = 0;
    lightboxTitle.textContent = project.title;
    lightboxMeta.textContent = `${project.category} — ${project.year}`;
    lightboxDescription.textContent = project.description || "";
    lightboxDescription.style.display = project.description ? "" : "none";
    updateMedia();
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightboxMedia.innerHTML = "";
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function updateMedia() {
    const items = galleryFor(currentProject);
    const nav = items.length > 1;
    btnPrev.style.display = nav ? "block" : "none";
    btnNext.style.display = nav ? "block" : "none";

    const item = items[currentIndex];
    lightboxMedia.innerHTML = "";

    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = item.src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      lightboxMedia.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = currentProject.title;
      lightboxMedia.appendChild(img);
    }
  }

  function step(delta) {
    const items = galleryFor(currentProject);
    currentIndex = (currentIndex + delta + items.length) % items.length;
    updateMedia();
  }

  btnClose.addEventListener("click", closeLightbox);
  btnPrev.addEventListener("click", () => step(-1));
  btnNext.addEventListener("click", () => step(1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
