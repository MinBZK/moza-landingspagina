(function () {
  var theme = localStorage.getItem('theme');
  if (theme) {
    document.documentElement.setAttribute('data-scheme', theme);
  }
})();
