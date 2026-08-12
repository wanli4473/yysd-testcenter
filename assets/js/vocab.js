/* vocab.js — legacy hub → bookshelf (phase 5) */
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var bookKey = (params.get("book") || "").trim();
  if (bookKey === "themes") {
    location.replace("vocab-shelf.html?view=catalog");
    return;
  }
  location.replace("vocab-shelf.html" + (bookKey ? ("?book=" + encodeURIComponent(bookKey)) : ""));
})();
