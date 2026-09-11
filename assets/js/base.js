// Weergave-menu in de footer
const themeButton = document.getElementById('theme-button');
const themeOptions = document.getElementById('theme-options');
if (themeButton && themeOptions) {
  const items = themeOptions.querySelectorAll('[role="menuitemradio"]');

  function markTheme() {
    const current = document.documentElement.getAttribute('data-scheme') || 'system';
    items.forEach(item => item.setAttribute('aria-checked', String(item.dataset.theme === current)));
  }

  function openThemeMenu(open) {
    themeButton.setAttribute('aria-expanded', String(open));
    themeOptions.hidden = !open;
  }

  themeButton.addEventListener('click', () => {
    const open = themeButton.getAttribute('aria-expanded') !== 'true';
    openThemeMenu(open);
    if (open) items[0].focus();
  });

  items.forEach(item => {
    item.addEventListener('click', () => {
      const theme = item.dataset.theme;
      if (theme === 'system') {
        document.documentElement.removeAttribute('data-scheme');
        localStorage.removeItem('theme');
      } else {
        document.documentElement.setAttribute('data-scheme', theme);
        localStorage.setItem('theme', theme);
      }
      markTheme();
      openThemeMenu(false);
      themeButton.focus();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && themeButton.getAttribute('aria-expanded') === 'true') {
      openThemeMenu(false);
      themeButton.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!themeButton.contains(event.target) && !themeOptions.contains(event.target)) {
      openThemeMenu(false);
    }
  });

  markTheme();
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
