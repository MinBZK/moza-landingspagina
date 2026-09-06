(function () {
  'use strict';

  var fuse = null;
  var searchData = [];
  var searchModal;
  var searchInput;
  var searchResults;
  var searchStatus;
  var searchTriggers;
  var activeFilter = '';

  var fuseOptions = {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'content', weight: 1 }
    ],
    threshold: 0.3, // 0 = exact match, 1 = alles matcht
    ignoreLocation: true,
    includeScore: true,
    findAllMatches: true,
    minMatchCharLength: 2
  };

  function init() {
    searchModal = document.getElementById('search-modal');
    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');
    searchStatus = document.getElementById('search-status');
    searchTriggers = document.querySelectorAll('.search-trigger');

    if (!searchModal || !searchInput || !searchResults) {
      return;
    }

    setupEventListeners();
  }

  function openModal() {
    searchModal.showModal();
    searchInput.select();
  }

  function closeModal() {
    searchModal.close();
    hideResults();
    searchInput.value = '';

    activeFilter = '';
    var filterButtons = searchModal.querySelectorAll('.search-filter');
    filterButtons.forEach(function (btn) {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    var defaultFilter = searchModal.querySelector('.search-filter[data-section=""]');
    if (defaultFilter) {
      defaultFilter.classList.add('active');
      defaultFilter.setAttribute('aria-pressed', 'true');
    }
  }

  function loadSearchIndex() {
    if (fuse) {
      return Promise.resolve();
    }

    var searchIndexUrl = searchModal.dataset.searchIndex || '/index.json';
    return fetch(searchIndexUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        searchData = data.map(function (item) {
          return {
            title: item.title,
            url: item.url,
            content: decodeHtmlEntities(item.content),
            section: item.section
          };
        });

        fuse = new Fuse(searchData, fuseOptions);
      });
  }

  function performSearch(query) {
    if (!query || query.length < 2) {
      hideResults();
      return;
    }

    loadSearchIndex().then(function () {
      var results = fuse.search(query);

      // De-dupliceer: toon alleen beste resultaat per pagina (URL zonder anchor)
      var seenPages = {};
      results = results.filter(function (result) {
        var baseUrl = result.item.url.split('#')[0];
        if (seenPages[baseUrl]) {
          return false;
        }
        seenPages[baseUrl] = true;
        return true;
      });

      if (activeFilter) {
        results = results.filter(function (result) {
          return result.item.section === activeFilter;
        });
      }

      displayResults(results.slice(0, 10), query);
    });
  }

  function buildSearchUrl(baseUrl, query) {
    var hashIndex = baseUrl.indexOf('#');
    var path = hashIndex !== -1 ? baseUrl.substring(0, hashIndex) : baseUrl;
    var hash = hashIndex !== -1 ? baseUrl.substring(hashIndex) : '';
    var separator = path.indexOf('?') === -1 ? '?' : '&';
    return path + separator + 'q=' + encodeURIComponent(query) + hash;
  }

  function announce(message) {
    if (searchStatus) {
      searchStatus.textContent = message;
    }
  }

  function displayResults(results, query) {
    if (results.length === 0) {
      searchResults.innerHTML = '<li class="search-no-results">Geen resultaten gevonden voor "' + escapeHtml(query) + '"</li>';
      announce('Geen resultaten gevonden voor ' + query);
      return;
    }

    announce(
      results.length === 1 ? '1 zoekresultaat' : results.length + ' zoekresultaten'
    );

    var html = results.map(function (result, i) {
      var item = result.item;
      var snippet = getSnippet(item.content, query);
      var snippetHtml = '';
      if (snippet) {
        var highlighted = highlightQuery(snippet, query).replace(/\n/g, '<br>');
        snippetHtml = '<span class="search-result-snippet">' + highlighted + '</span>';
      }

      var url = buildSearchUrl(item.url, query);
      return '<li>' +
        '<a href="' + url + '" class="search-result-item" tabindex="' + (i === 0 ? '0' : '-1') + '">' +
        '<span class="search-result-title">' + highlightQuery(item.title, query) + '</span>' +
        snippetHtml +
        '</a>' +
        '</li>';
    }).join('');

    searchResults.innerHTML = html;
  }

  function hideResults() {
    searchResults.innerHTML = '';
    announce('');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function decodeHtmlEntities(text) {
    var div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || div.innerText || '';
  }

  function getSnippet(content, query) {
    if (!content) return '';

    var text = content.replace(/\n+/g, '\n').replace(/[ \t]+/g, ' ').trim();
    var maxLength = 250;

    if (!query) {
      if (text.length <= maxLength) return text;
      return truncateAtWordBoundary(text, maxLength) + '…';
    }

    var lowerText = text.toLowerCase();
    var lowerQuery = query.toLowerCase();
    var matchIndex = lowerText.indexOf(lowerQuery);

    if (matchIndex === -1) {
      if (text.length <= maxLength) return text;
      return truncateAtWordBoundary(text, maxLength) + '…';
    }

    if (text.length <= maxLength) {
      return text;
    }

    var queryLength = query.length;
    var halfContext = Math.floor((maxLength - queryLength) / 2);

    var start = Math.max(0, matchIndex - halfContext);
    var end = Math.min(text.length, matchIndex + queryLength + halfContext);

    if (start === 0) {
      end = Math.min(text.length, maxLength);
    } else if (end === text.length) {
      start = Math.max(0, text.length - maxLength);
    }

    if (start > 0) {
      var spaceAfterStart = text.indexOf(' ', start);
      if (spaceAfterStart !== -1 && spaceAfterStart < matchIndex) {
        start = spaceAfterStart + 1;
      }
    }

    if (end < text.length) {
      var spaceBeforeEnd = text.lastIndexOf(' ', end);
      if (spaceBeforeEnd !== -1 && spaceBeforeEnd > matchIndex + queryLength) {
        end = spaceBeforeEnd;
      }
    }

    var snippet = text.substring(start, end).trim();

    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';

    return snippet;
  }

  function truncateAtWordBoundary(text, maxLength) {
    if (text.length <= maxLength) return text;
    var truncated = text.substring(0, maxLength);
    var lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace);
    }
    return truncated;
  }

  function highlightQuery(text, query) {
    if (!text || !query) return escapeHtml(text);

    var escaped = escapeHtml(text);
    // Escape query op dezelfde manier als tekst, zodat & matcht met &amp;
    var escapedQuery = escapeHtml(query);
    var regex = new RegExp('(' + escapeRegex(escapedQuery) + ')', 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function setupEventListeners() {
    searchTriggers.forEach(function(trigger) {
      trigger.addEventListener('click', openModal);
    });

    var closeButton = document.getElementById('search-close');
    if (closeButton) {
      closeButton.addEventListener('click', closeModal);
    }

    var filterButtons = searchModal.querySelectorAll('.search-filter');
    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        filterButtons.forEach(function (btn) {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        activeFilter = button.dataset.section;
        var query = searchInput.value.trim();
        if (query.length >= 2) {
          performSearch(query);
        }
      });
    });

    var debounceTimer;
    searchInput.addEventListener('input', function (e) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        performSearch(e.target.value.trim());
      }, 150);
    });

    searchModal.addEventListener('click', function (e) {
      if (e.target === searchModal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      var activeElement = document.activeElement;
      var isTyping = activeElement.tagName === 'INPUT' ||
                     activeElement.tagName === 'TEXTAREA' ||
                     activeElement.isContentEditable;

      if (e.key === '/' && !isTyping && !searchModal.open) {
        e.preventDefault();
        openModal();
      }
    });

    searchInput.addEventListener('keydown', function (e) {
      var items = searchResults.querySelectorAll('.search-result-item');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
          items[0].focus();
        }
      } else if (e.key === 'Enter') {
        if (items.length > 0) {
          e.preventDefault();
          items[0].click();
        }
      }
    });

    searchResults.addEventListener('keydown', function (e) {
      var items = searchResults.querySelectorAll('.search-result-item');
      var activeItem = document.activeElement;
      var activeIndex = Array.from(items).indexOf(activeItem);

      if (activeIndex === -1) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIndex < items.length - 1) {
          items[activeIndex + 1].focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIndex > 0) {
          items[activeIndex - 1].focus();
        } else {
          searchInput.focus();
        }
      }
    });
  }

  function highlightPageContent() {
    var params = new URLSearchParams(window.location.search);
    var query = params.get('q');

    if (!query || query.length < 2) return;

    var mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // q parameter blijft in URL zodat highlight deelbaar is
    highlightTextNodes(mainContent, query);
    showHighlightBar(query);
  }

  function showHighlightBar(query) {
    var highlightBar = document.getElementById('highlight-bar');
    var querySpan = document.getElementById('highlight-bar-query');

    if (!highlightBar || !querySpan) return;

    querySpan.textContent = query;
    highlightBar.hidden = false;
    highlightBar.addEventListener('click', hideHighlights);
    document.addEventListener('keydown', handleHighlightEscape);
  }

  function handleHighlightEscape(e) {
    if (e.key === 'Escape' && !(searchModal && searchModal.open)) {
      hideHighlights();
    }
  }

  function hideHighlights() {
    var mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.querySelectorAll('mark').forEach(function (mark) {
        mark.replaceWith(mark.textContent);
      });
      mainContent.normalize();
    }

    var highlightBar = document.getElementById('highlight-bar');
    if (highlightBar) {
      highlightBar.hidden = true;
    }

    var url = new URL(window.location.href);
    url.searchParams.delete('q');
    window.history.replaceState({}, '', url.toString());

    document.removeEventListener('keydown', handleHighlightEscape);
  }

  function highlightTextNodes(element, query) {
    var walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    var nodesToProcess = [];
    var node;

    while ((node = walker.nextNode())) {
      if (node.nodeValue.toLowerCase().indexOf(query.toLowerCase()) !== -1) {
        nodesToProcess.push(node);
      }
    }

    nodesToProcess.forEach(function (textNode) {
      var text = textNode.nodeValue;
      var regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');
      var parts = text.split(regex);

      if (parts.length === 1) return;

      var fragment = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (part.toLowerCase() === query.toLowerCase()) {
          var mark = document.createElement('mark');
          mark.textContent = part;
          fragment.appendChild(mark);
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
      });

      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      highlightPageContent();
    });
  } else {
    init();
    highlightPageContent();
  }
})();
