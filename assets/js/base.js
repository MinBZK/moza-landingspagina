// Theme toggle
const toggle = document.getElementById('theme-toggle');
if (toggle) {
  toggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-scheme');
    let targetTheme = 'light';

    if (!currentTheme) {
      targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
    } else {
      targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
    }

    document.documentElement.setAttribute('data-scheme', targetTheme);
    localStorage.setItem('theme', targetTheme);
  });
}

// Subnav panel toggles
const defaultPanel = document.querySelector('.subnav-panel:not([hidden])');
const defaultPanelId = defaultPanel ? defaultPanel.id : null;
const defaultInSection = document.querySelector('.navbar-sub .in-section');

document.querySelectorAll('.subnav-toggle').forEach(btn => {
  btn.addEventListener('click', function() {
    const panelId = this.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    const expanded = this.getAttribute('aria-expanded') === 'true';

    document.querySelectorAll('.subnav-panel:not([hidden])').forEach(otherPanel => {
      if (otherPanel.id !== panelId) {
        otherPanel.hidden = true;
      }
    });

    document.querySelectorAll('.subnav-toggle[aria-expanded="true"]').forEach(other => {
      if (other !== this) {
        other.setAttribute('aria-expanded', 'false');
      }
    });

    if (!expanded) {
      document.querySelectorAll('.navbar-sub .in-section').forEach(el => {
        el.classList.remove('in-section');
      });
    }

    this.setAttribute('aria-expanded', !expanded);
    if (panel) panel.hidden = expanded;

    if (expanded && panelId !== defaultPanelId && defaultPanelId) {
      const origPanel = document.getElementById(defaultPanelId);
      if (origPanel) origPanel.hidden = false;
      if (defaultInSection) defaultInSection.classList.add('in-section');
    }
  });
});

// Mobile menu toggle
document.querySelectorAll('.navbar .toggle').forEach(btn => {
  btn.addEventListener('click', function() {
    const expanded = this.getAttribute('aria-expanded') === 'true';
    const targetId = this.getAttribute('aria-controls');
    const target = document.getElementById(targetId);

    this.setAttribute('aria-expanded', !expanded);
    this.setAttribute('aria-label', !expanded ? 'Menu sluiten' : 'Menu openen');
  });
});

// Mobile theme toggle (sync with main toggle)
const mobileThemeToggle = document.querySelector('.mobile-theme');
if (mobileThemeToggle && toggle) {
  mobileThemeToggle.addEventListener('click', () => {
    toggle.click();
  });
}

// Sluit mobiel menu bij resize naar desktop
const desktopBreakpoint = 900;
let wasDesktop = window.innerWidth >= desktopBreakpoint;

window.addEventListener('resize', () => {
  const isDesktop = window.innerWidth >= desktopBreakpoint;
  if (isDesktop && !wasDesktop) {
    document.querySelectorAll('.toggle[aria-expanded="true"]').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Menu openen');
    });
  }
  wasDesktop = isDesktop;
});
