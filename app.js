const downloadUrls = {
  release: "https://github.com/KonataLin/AmpSysDownloadPage/releases/download/v0.1.0-alpha.9/AmpSysCadencePlugin_release_alpha9_clean_cross_pdk_20260727.zip"
};

const releaseApiUrl = "https://api.github.com/repos/KonataLin/AmpSysDownloadPage/releases/tags/v0.1.0-alpha.9";
const releaseAssetName = "AmpSysCadencePlugin_release_alpha9_clean_cross_pdk_20260727.zip";

const root = document.documentElement;
const toast = document.querySelector("#toast");
const themeButton = document.querySelector("#themeButton");
const mikuPet = document.querySelector("#mikuPet");
const mikuTip = document.querySelector("#mikuTip");
let toastTimer = 0;
let mikuMoveTimer = 0;
let animeIdleTimer = 0;
let downloadPatrolTimer = 0;

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("ampsys-theme", theme);
  themeButton.setAttribute("aria-label", theme === "dark" ? "切换为浅色主题" : "切换为深色主题");
  themeButton.setAttribute("title", theme === "dark" ? "切换为浅色主题" : "切换为深色主题");
  themeButton.innerHTML =
    theme === "dark"
      ? '<i data-lucide="sun" aria-hidden="true"></i>'
      : '<i data-lucide="moon-star" aria-hidden="true"></i>';
  refreshIcons();
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function wireScrolling() {
  document.querySelectorAll("[data-scroll-target]").forEach((control) => {
    control.addEventListener("click", () => scrollToSection(control.dataset.scrollTarget));
  });
}

function wireTheme() {
  setTheme(localStorage.getItem("ampsys-theme") || "light");

  themeButton.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    showToast(nextTheme === "dark" ? "深色主题已开启" : "浅色主题已开启");
  });
}

function wireDownloads() {
  document.querySelectorAll("[data-download]").forEach((link) => {
    const url = downloadUrls[link.dataset.download];
    if (url) {
      link.href = url;
      link.setAttribute("download", "");
      return;
    }

    link.addEventListener("click", (event) => {
      event.preventDefault();
      showToast("下载接口还没有配置文件路径。");
    });
  });
}

function formatBytes(bytes) {
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = Number(bytes);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatLocalDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (part) => String(part).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  ].join(" ");
}

async function refreshReleaseMeta() {
  const sizeTarget = document.querySelector("[data-release-size]");
  const updatedTarget = document.querySelector("[data-release-updated]");
  const url = downloadUrls.release;
  if (!url || (!sizeTarget && !updatedTarget)) return;

  try {
    const releaseResponse = await fetch(releaseApiUrl, { cache: "no-store" });
    if (releaseResponse.ok) {
      const release = await releaseResponse.json();
      const asset = release.assets?.find((item) => item.name === releaseAssetName);

      if (asset?.browser_download_url) {
        downloadUrls.release = asset.browser_download_url;
        document.querySelectorAll("[data-download='release']").forEach((link) => {
          link.href = asset.browser_download_url;
        });
      }

      if (asset?.size && sizeTarget) {
        sizeTarget.textContent = `版本包大小：${formatBytes(asset.size)}`;
      }

      const updatedAt = asset?.updated_at || release.published_at;
      const localDate = updatedAt ? formatLocalDate(updatedAt) : "";
      if (localDate && updatedTarget) {
        updatedTarget.textContent = `文件更新时间：${localDate}`;
      }

      return;
    }

    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (!response.ok) return;

    const contentLength = response.headers.get("content-length");
    if (contentLength && sizeTarget) {
      sizeTarget.textContent = `版本包大小：${formatBytes(contentLength)}`;
    }

    const lastModified = response.headers.get("last-modified");
    const localDate = lastModified ? formatLocalDate(lastModified) : "";
    if (localDate && updatedTarget) {
      updatedTarget.textContent = `文件更新时间：${localDate}`;
    }
  } catch {
    // Keep the static fallback text when the server cannot answer HEAD requests.
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the older selection-based path.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function wireCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copy);
      if (!target) return;

      try {
        await copyText(target.innerText.trim());
        showToast("安装命令已复制");
      } catch {
        showToast("复制失败，可以手动选中命令。");
      }
    });
  });
}

function wireReveal() {
  const revealItems = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -48px" }
  );

  revealItems.forEach((item, index) => {
    if (item.getBoundingClientRect().top < window.innerHeight * 0.96) {
      item.classList.add("is-visible");
      return;
    }

    item.classList.add("reveal-pending");
    item.style.transitionDelay = `${Math.min(index * 35, 180)}ms`;
    observer.observe(item);
  });
}

function wireBackgroundMotion() {
  let ticking = false;

  window.addEventListener("pointermove", (event) => {
    root.style.setProperty("--mx", `${event.clientX - window.innerWidth / 2}px`);
  });

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        root.style.setProperty("--scroll", `${window.scrollY}px`);
        ticking = false;
      });
    },
    { passive: true }
  );
}

function randomBetween(min, max) {
  return min + Math.random() * Math.max(0, max - min);
}

function mikuSize() {
  return window.innerWidth < 680
    ? { width: 104, height: 118 }
    : { width: 132, height: 148 };
}

function positionMikuPet(immediate = false) {
  if (!mikuPet) return;

  const size = mikuSize();
  const isCompact = window.innerWidth < 680;
  const maxX = Math.max(12, window.innerWidth - size.width - 16);
  const walkMin = window.innerWidth < 1120 ? window.innerWidth - size.width - 22 : window.innerWidth * 0.56;
  const walkMax = window.innerWidth < 1120 ? maxX : Math.min(maxX, window.innerWidth * 0.82);
  const x = isCompact
    ? Math.max(8, window.innerWidth - size.width - 10)
    : randomBetween(Math.max(18, walkMin), Math.max(walkMin, walkMax));
  const y = isCompact
    ? Math.max(112, window.innerHeight - size.height - 18)
    : Math.max(96, window.innerHeight - size.height - randomBetween(24, 96));
  const transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

  mikuPet.style.width = `${size.width}px`;
  mikuPet.style.height = `${size.height}px`;
  mikuPet.style.transform = transform;
  mikuPet.style.transitionDuration = immediate ? "0ms" : "1600ms";
}

function sparkleAt(x, y) {
  for (let i = 0; i < 9; i += 1) {
    const dot = document.createElement("span");
    dot.className = "sparkle-dot";
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.style.setProperty("--dx", `${randomBetween(-54, 54)}px`);
    dot.style.setProperty("--dy", `${randomBetween(-82, -22)}px`);
    document.body.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove(), { once: true });
  }
}

function setMikuTip(text) {
  if (!mikuTip || !mikuPet) return;
  mikuTip.textContent = text;
  mikuPet.classList.add("is-talking");
  window.clearTimeout(setMikuTip.timer);
  setMikuTip.timer = window.setTimeout(() => {
    mikuPet.classList.remove("is-talking");
  }, 2400);
}

const animeStates = [
  "idle",
  "run-right",
  "run-left",
  "wave",
  "cheer",
  "sleepy",
  "surprise",
  "happy",
  "dash",
  "shy"
];
const animeStateClasses = animeStates.map((state) => `anime-state-${state}`);

function setAnimeState(character, state, duration = 0) {
  if (!character || !animeStates.includes(state)) return;

  window.clearTimeout(character.animeStateTimer);
  character.classList.remove(...animeStateClasses);
  character.classList.add(`anime-state-${state}`);

  if (duration > 0) {
    character.animeStateTimer = window.setTimeout(() => {
      setAnimeState(character, character.dataset.defaultState || "idle");
    }, duration);
  }
}

function popAnimeCharacter(character, state = "cheer", duration = 1600, tip = "") {
  if (!character) return;

  setAnimeState(character, state, duration);
  character.classList.remove("is-bounced");
  void character.offsetWidth;
  character.classList.add("is-bounced");

  if (tip) {
    if (mikuPet) {
      setMikuTip(tip);
    } else {
      showToast(tip);
    }
  }
}

function triggerAnime(selector, state, duration = 1600, tip = "") {
  document.querySelectorAll(selector).forEach((character) => {
    popAnimeCharacter(character, state, duration, tip);
  });
}

function resetAnimeIdleTimer() {
  window.clearTimeout(animeIdleTimer);
  animeIdleTimer = window.setTimeout(() => {
    document.querySelectorAll(".anime-character").forEach((character) => {
      setAnimeState(character, "sleepy", 6800);
    });
  }, 14000);
}

function initDownloadPatrol() {
  const character = document.querySelector(".download-character");
  if (!character) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const left = -126;
  const right = 118;
  const duration = 3600;
  const pause = 280;
  let direction = 1;
  let legStart = performance.now();
  let pauseUntil = 0;

  character.style.setProperty("--patrol-x", `${left}px`);
  character.style.setProperty("--move-x", `${left}px`);
  character.style.setProperty("--move-y", "0px");
  setAnimeState(character, "run-right");

  function updatePatrol(now) {
    if (pauseUntil) {
      if (now >= pauseUntil) {
        direction *= -1;
        legStart = now;
        pauseUntil = 0;
        setAnimeState(character, direction > 0 ? "run-right" : "run-left");
      }
      downloadPatrolTimer = window.requestAnimationFrame(updatePatrol);
      return;
    }

    const progress = clamp((now - legStart) / duration, 0, 1);
    const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
    const speedWeight = Math.sin(progress * Math.PI);
    const stride = Math.abs(Math.sin(progress * Math.PI * 8));
    const start = direction > 0 ? left : right;
    const end = direction > 0 ? right : left;
    const position = start + (end - start) * eased;
    const anticipation = progress < 0.08 ? (1 - progress / 0.08) * -3.5 : 0;
    const bob = -stride * (2.5 + speedWeight * 6.5);
    const lean = direction * (1.4 + speedWeight * 6.2 + anticipation);
    const squashX = 1 + stride * (0.015 + speedWeight * 0.025);
    const squashY = 1 - stride * (0.012 + speedWeight * 0.022);
    const shadowScale = 0.92 + stride * (0.12 + speedWeight * 0.16);
    const shadowOpacity = 0.52 + stride * 0.2;

    character.style.setProperty("--patrol-x", `${position.toFixed(2)}px`);
    character.style.setProperty("--move-x", `${position.toFixed(2)}px`);
    character.style.setProperty("--move-y", `${bob.toFixed(2)}px`);
    character.style.setProperty("--bob-y", `${bob.toFixed(2)}px`);
    character.style.setProperty("--lean", `${lean.toFixed(2)}deg`);
    character.style.setProperty("--squash-x", squashX.toFixed(3));
    character.style.setProperty("--squash-y", squashY.toFixed(3));
    character.style.setProperty("--shadow-scale", shadowScale.toFixed(3));
    character.style.setProperty("--shadow-opacity", shadowOpacity.toFixed(3));

    if (progress >= 1) {
      pauseUntil = now + pause;
    }

    downloadPatrolTimer = window.requestAnimationFrame(updatePatrol);
  }

  window.cancelAnimationFrame(downloadPatrolTimer);
  downloadPatrolTimer = window.requestAnimationFrame(updatePatrol);
}

function initAnimeCharacters() {
  const characters = document.querySelectorAll(".anime-character");
  if (!characters.length) return;

  characters.forEach((character) => {
    setAnimeState(character, character.dataset.defaultState || "idle");

    character.addEventListener("pointerenter", () => {
      const hoverState = character.classList.contains("download-character") ? "dash" : "happy";
      setAnimeState(character, hoverState, 1200);
      resetAnimeIdleTimer();
    });

    character.addEventListener("pointerdown", (event) => {
      sparkleAt(event.clientX, event.clientY);
      popAnimeCharacter(character, "cheer", 2100, character.dataset.animeTip || "");
      resetAnimeIdleTimer();
    });

    character.addEventListener("animationend", (event) => {
      if (event.animationName === "animeCharacterPop") {
        character.classList.remove("is-bounced");
      }
    });
  });

  document.querySelectorAll("[data-download]").forEach((link) => {
    link.addEventListener("pointerenter", () => triggerAnime(".download-character", "dash", 1400));
    link.addEventListener("click", () => triggerAnime(".download-character", "cheer", 2600, "开始下载，冲呀"));
  });

  document.querySelectorAll(".copy-button").forEach((button) => {
    button.addEventListener("click", () => triggerAnime(".hero-character", "wave", 1900, "命令复制完成"));
  });

  themeButton.addEventListener("click", () => {
    triggerAnime(".hero-character, .support-character", "surprise", 1800, "主题切换，哇");
  });

  document.querySelectorAll(".support-card").forEach((card) => {
    card.addEventListener("pointerenter", () => triggerAnime(".support-character", "happy", 1700));
    card.addEventListener("focus", () => triggerAnime(".support-character", "wave", 1700));
  });

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target.id === "download") {
            resetAnimeIdleTimer();
          } else if (entry.target.id === "install") {
            triggerAnime(".hero-character", "shy", 1800);
          } else if (entry.target.id === "workflow") {
            triggerAnime(".hero-character", "happy", 1800);
          } else if (entry.target.id === "support") {
            triggerAnime(".support-character", "wave", 2200);
          }
        });
      },
      { threshold: 0.34 }
    );

    document.querySelectorAll("#download, #install, #workflow, #support").forEach((section) => {
      sectionObserver.observe(section);
    });
  }

  initDownloadPatrol();
  window.addEventListener("pointermove", resetAnimeIdleTimer, { passive: true });
  window.addEventListener("keydown", resetAnimeIdleTimer);
  resetAnimeIdleTimer();
}

function initMikuPet() {
  if (!mikuPet) return;

  positionMikuPet(true);
  window.requestAnimationFrame(() => mikuPet.classList.add("is-ready"));
  setMikuTip("Q版 Miku 到位");

  mikuPet.addEventListener("pointerdown", (event) => {
    const rect = mikuPet.getBoundingClientRect();
    sparkleAt(event.clientX, event.clientY);
    setMikuTip(event.clientY < rect.top + rect.height * 0.48 ? "摸头成功!" : "一起调参!");
    mikuPet.classList.add("is-patted");
    window.setTimeout(() => mikuPet.classList.remove("is-patted"), 620);
  });

  window.addEventListener("resize", () => positionMikuPet(true));
  window.clearInterval(mikuMoveTimer);
  mikuMoveTimer = window.setInterval(() => {
    positionMikuPet();
  }, 5200);
}

document.addEventListener("DOMContentLoaded", () => {
  refreshIcons();
  wireScrolling();
  wireTheme();
  wireDownloads();
  refreshReleaseMeta();
  wireCopyButtons();
  wireReveal();
  wireBackgroundMotion();
  initMikuPet();
  initAnimeCharacters();
});
