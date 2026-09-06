window.addEventListener('DOMContentLoaded', () => {
  const closeButton = document.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      history.back();
    });
  }

  if (typeof Reveal !== 'undefined') {
    Reveal.initialize({
      embedded: true,
      controls: true,
      progress: true,
      overview: true,
      hash: true
    }).then(() => {
      // Check logo visibility on initial load
      updateLogoVisibility(Reveal.getCurrentSlide());
      vertaalBediening();
    });

    // Reveal.js zet Engelse aria-labels op zijn knoppen. Ze staan hardgecodeerd
    // in de bundel en kennen geen taalinstelling.
    function vertaalBediening() {
      const labels = {
        '.navigate-left': 'Vorige slide',
        '.navigate-right': 'Volgende slide',
        '.navigate-up': 'Slide hierboven',
        '.navigate-down': 'Slide hieronder',
        '.resume-button': 'Presentatie hervatten'
      };
      for (const [selector, label] of Object.entries(labels)) {
        for (const el of document.querySelectorAll(selector)) {
          el.setAttribute('aria-label', label);
        }
      }
    }

    function updateLogoVisibility(slide) {
      const logo = document.getElementById('header-logo');
      if (logo) {
        if (slide && slide.classList.contains('hide-logo')) {
          logo.classList.add('logo-hidden');
        } else {
          logo.classList.remove('logo-hidden');
        }
      }
    }

    // Hide logo when slide has .hide-logo class
    Reveal.on('slidechanged', event => {
      updateLogoVisibility(event.currentSlide);
    });
  }
});
