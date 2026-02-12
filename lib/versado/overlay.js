console.log("Versado Overlay Init");
let scrollpane;
let glossary, allglossary;
let lastUrl = location.href;
let allPops = [];
let bookmarkData = [];
let noteData = []; // (left here harmlessly; not used now)
let pIndex = [];
let bmnPageStr = "";
let contentID;
let vbtn_addbookmark, vbtn_glossary, vbtn_bookmark;
let v_content_title;
let v_section_title;
let v_highlight_toggle = 0;
let outsideClickListenerFunction = null;

/**
 * Helper function to remove all HTML tags, returning plain text.
 * e.g. stripHtml('<span>hello</span>') -> 'hello'
 */
function stripHtml(htmlString) {
  return htmlString.replace(/<[^>]*>/g, "");
}

/**
 * Helper function to escape special regex characters ((), [], +, etc.)
 * so we can safely use the string in new RegExp(...).
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Helper to escape quotes in a string so it doesn't break HTML attributes.
 */
function escapeAttribute(str) {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

document.addEventListener("DOMContentLoaded", function () {
  // Create the floating glossary widget (if not already present)
  if (!document.getElementById("versado_glossary_button")) {
    var glossaryButton = document.createElement("div");
    glossaryButton.id = "versado_glossary_button";
    glossaryButton.className = "v_action_button";
    glossaryButton.innerHTML =
      '<img src="lib/versado/icons/book-blank.svg" alt="Glossary">';
    glossaryButton.modaltype = "glossary";
    glossaryButton.addEventListener("click", showModal);
    document.body.appendChild(glossaryButton);
  }

  // NOTES REMOVED: no floating notes widget button
});

window.onload = function () {
  // Get current contentID etc.
  var currenturl = window.location.href.toString();
  var currenturlarray = currenturl.split("/");
  contentID = currenturlarray[currenturlarray.length - 1];
  console.log(contentID);

  setTimeout(addPanel, 100);

  async function addPanel() {
    var response = await fetch("lib/versado/definitions.json");
    var obj = await response.json();
    allglossary = obj.terms;
    console.log(
      "Available glossary terms:",
      allglossary.map((t) => t.term)
    );

    console.log("Adding Versado Overlay - Definitions Only");
    var panelcontent = "";
    var panelbutton = "";
    // Existing panel buttons:
    panelcontent +=
      '<div class="v_panel_btn" id="v_btn_glossary"><img src="lib/versado/icons/book-blank.svg" width="24" height="24"/></div>';
    panelcontent +=
      '<div class="v_panel_btn" id="v_btn_bookmark"><img src="lib/versado/icons/bookmark.svg" width="24" height="24"/></div>';
    panelcontent +=
      '<div class="v_panel_btn" id="v_btn_addbookmark"><img src="lib/versado/icons/highlighter-line.svg" width="24" height="24"/></div>';
    // NOTES REMOVED: no Notes panel button
    panelbutton +=
      '<img src="lib/versado/icons/book-blank.svg" width="28" height="28"/>';

    const vbtn = document.createElement("div");
    vbtn.setAttribute("id", "versado_button");
    vbtn.classList.add("v_action_button");
    vbtn.addEventListener("click", showModal);
    vbtn.modaltype = "glossary";
    vbtn.innerHTML = panelbutton;

    const vpnl = document.createElement("div");
    vpnl.setAttribute("id", "versado_panel");
    vpnl.classList.add("v_action_panel");

    document.body.insertAdjacentElement("afterbegin", vbtn);

    // NOTES REMOVED: no Notes button listener

    console.log("Page Loaded Panel Added");
    v_glossarySearch();

    /* ------------------------------------------------------------------ *
     *  Failsafe watchdog: keeps running.      *
     * ------------------------------------------------------------------ */
    (function startGlossaryWatchdog() {
      const INTERVAL = 400; // ms – tweak if you like

      setInterval(() => {
        if (document.body.innerHTML.includes("~|")) {
          v_glossarySearch();
        }
      }, INTERVAL);
    })();

    var clickp = document.getElementsByTagName("p");
    for (let i = 0; i < clickp.length; i++) {
      clickp[i].addEventListener("click", function () {
        console.log("p-clicked");
      });
    }
  }
};

/***********************************
 * v_glossarySearch: Revised
 ***********************************/
async function v_glossarySearch() {
  if (!document.body.innerHTML.includes("~|")) return;
  const v_blocktext = document.getElementsByTagName("p");
  const v_bullettext = document.getElementsByTagName("li");

  // Helper to strip HTML tags (for plain text matching with JSON)
  function stripHtml(htmlString) {
    return htmlString.replace(/<[^>]*>/g, "");
  }

  // Escapes RegExp metacharacters
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Escapes quotes in attributes
  function escapeAttribute(str) {
    return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Looks up a definition in allglossary, ignoring case
  function getDefinition(term) {
    let cleanedTerm = term
      .replace(/&nbsp;/g, " ")
      .replace(/[^\w\s]/gi, "")
      .trim()
      .toLowerCase();

    console.log("Searching for (cleaned):", cleanedTerm);

    // First, check against the main term field
    for (let i = 0; i < allglossary.length; i++) {
      let cleanedGlossaryTerm = allglossary[i].term
        .replace(/&nbsp;/g, " ")
        .replace(/[^\w\s]/gi, "")
        .trim()
        .toLowerCase();

      console.log(`Comparing with: ${cleanedGlossaryTerm}`);
      if (cleanedTerm === cleanedGlossaryTerm) {
        console.log("Match found:", allglossary[i].term);
        return allglossary[i].definition;
      }
    }

    // If no direct match is found, check the aliases field if available.
    for (let i = 0; i < allglossary.length; i++) {
      if (allglossary[i].aliases) {
        // Split the aliases string into an array, trimming spaces and lowering case.
        let aliasesArray = allglossary[i].aliases.split(",").map((a) =>
          a
            .replace(/&nbsp;/g, " ")
            .replace(/[^\w\s]/gi, "")
            .trim()
            .toLowerCase()
        );
        if (aliasesArray.includes(cleanedTerm)) {
          console.log(
            "Match found via alias:",
            cleanedTerm,
            "maps to",
            allglossary[i].term
          );
          return allglossary[i].definition;
        }
      }
    }

    console.log("No match found for:", term);
    return "";
  }

  /**********************************************
   * Process a single DOM element (p or li)
   **********************************************/
  function processElement(elem) {
    if (elem.dataset.vProcessed) return; // skip if flagged
    if (!elem.innerHTML.includes("~|")) return;

    // Split on ~|
    let segments = elem.innerHTML.split("~|");
    if (segments.length < 2) {
      return; // No ~| found, no glossary replacements needed
    }

    // We'll rebuild the entire innerHTML in one pass
    let rebuilt = segments[0]; // everything before the first ~|

    // For segments[1..end], each chunk might look like: "someTerm|~ ...rest..."
    for (let i = 1; i < segments.length; i++) {
      let chunk = segments[i];

      // If there's no "|~" in this chunk, then this piece doesn't contain a complete marker.
      let splitIndex = chunk.indexOf("|~");
      if (splitIndex === -1) {
        // Just append ~| plus the entire chunk (since we didn't find a matching |~)
        rebuilt += "~|" + chunk;
        continue;
      }

      // rawTermHtml is the substring before "|~"
      let rawTermHtml = chunk.slice(0, splitIndex);
      // The rest is what's left after "|~"
      let afterTerm = chunk.slice(splitIndex + 2);

      // Now we have the exact text in between ~| and |~
      // Possibly containing <span>, <strong>, etc.
      let plainTerm = stripHtml(rawTermHtml).trim();
      console.log("Extracted term from HTML:", plainTerm); // Debug log
      let definition = getDefinition(plainTerm);

      // Prepare attributes
      let safeTerm = escapeAttribute(plainTerm);
      let safeDef = escapeAttribute(definition);

      // Construct the replacement button
      // The button text preserves any original markup in rawTermHtml
      let uid = Math.random().toString(36).slice(2); // keeps ids unique
      let buttonHTML =
        `<button class="v_term" id="v_term_${uid}" ` +
        `name="${safeTerm}" value="${safeDef}" ` +
        `onClick="v_showDef(this, this.name, this.value)">` +
        rawTermHtml +
        `</button>`;

      // Before appending, delete "space-then-punctuation"
      afterTerm = afterTerm.replace(/^\s+([,.;!?])/, "$1");

      // Add the new button plus whatever comes after "|~"
      rebuilt += buttonHTML + afterTerm;
    }

    // Finally, set the element's innerHTML to the rebuilt result
    elem.innerHTML = rebuilt;

    elem.dataset.vProcessed = "true";
  }

  // Process all <p> elements
  for (let i = 0; i < v_blocktext.length; i++) {
    processElement(v_blocktext[i]);
  }

  // Process all <li> elements
  for (let j = 0; j < v_bullettext.length; j++) {
    processElement(v_bullettext[j]);
  }
}

/**
 * Shows a definition popup when a glossary term is clicked.
 */
async function v_showDef(e, n, d) {
  console.log(e); // event
  console.log(n); // name/term
  console.log(d); // definition

  console.log(allPops.length);
  if (allPops.length > 0) {
    console.log("Kill Pops");
    killPops();
  }

  let iscover = document.getElementsByClassName("cover-container").length;
  console.log(iscover);
  if (iscover > 0) {
    scrollpane = document.getElementById("cover");
  } else {
    scrollpane = document.getElementById("page-wrap");
  }

  console.log(scrollpane);
  if (scrollpane) {
    scrollpane.addEventListener("scroll", killPops);
  }

  // create the element for the popup
  var v_def_popup = document.createElement("div");
  var targetEl = document.getElementById(e.id);
  if (!targetEl) return;
  var v_popup_pos = targetEl.getBoundingClientRect();

  let winheight = self.innerHeight;
  let v_popup_x = v_popup_pos.left;
  let v_popup_y = winheight - v_popup_pos.top;

  v_def_popup.setAttribute("id", "v_popup_" + e.id);

  let definitioncontent = "<div class='v_definition_box_content'>";
  definitioncontent +=
    '<div id="__close_' +
    e.id +
    '" class="v_definition_box_content_close" onclick="killPops()"><img src="lib/versado/icons/circle-xmark.svg" width="24" height="24" /></div>';
  definitioncontent += '<div class="v_definition_box_definition">';
  definitioncontent += "<h3>" + n + "</h3>";
  definitioncontent += "<p>" + d + "</p>";
  definitioncontent +=
    '<div id="__' +
    e.id +
    '" class="small-link"><img src="lib/versado/icons/book-blank.svg" width="16" height="16";  "/> Full Glossary</div>';
  definitioncontent += "</div>";
  definitioncontent += "</div><div class='v_definition_box_carat'>";

  v_def_popup.innerHTML = definitioncontent;

  console.log(winheight);
  let lessoncontent = document.getElementsByTagName("main")[0];
  if (!lessoncontent) lessoncontent = document.body;
  lessoncontent.appendChild(v_def_popup);

  v_def_popup.setAttribute(
    "style",
    "bottom:" + v_popup_y + "px;left:" + v_popup_x + "px;position:fixed;z-index:9999"
  );
  v_def_popup.setAttribute("class", "v_definition_box");

  allPops = document.querySelectorAll('[id^="v_popup_"]');
  let allPopLinks = document.querySelectorAll('[id^="__v_term"]');
  if (allPopLinks.length > 0) {
    allPopLinks[0].addEventListener("click", showModal);
    allPopLinks[0].modaltype = "glossary";
  }
  console.log(allPopLinks.length);

  // Add event listener to close popup if user clicks outside it
  setTimeout(function () {
    outsideClickListenerFunction = function (event) {
      if (!v_def_popup.contains(event.target)) {
        killPops();
        document.removeEventListener("click", outsideClickListenerFunction);
        outsideClickListenerFunction = null;
      }
    };
    document.addEventListener("click", outsideClickListenerFunction);
  }, 0);
}

function killPops() {
  if (outsideClickListenerFunction) {
    document.removeEventListener("click", outsideClickListenerFunction);
    outsideClickListenerFunction = null;
  }
  if (allPops.length > 0) {
    for (let i = 0; i < allPops.length; i++) {
      let popEl = document.getElementById(allPops[i].id);
      if (popEl) popEl.remove();
    }
    allPops = [];
    console.log(allPops.length);
  }
}

function closeModal() {
  console.log("close modal");
  let modalEl = document.getElementById("v_modal");
  if (modalEl) modalEl.remove();
}

/**
 * Show a modal (Full Glossary only — NOTES REMOVED)
 */
async function showModal(e) {
  killPops();
  let modaltype = e.currentTarget.modaltype;
  console.log("Show " + modaltype + " modal");

  // Only support glossary now
  if (modaltype !== "glossary") return;

  var headerEl = document.getElementsByClassName("nav-sidebar-header__title")[0];
  v_content_title = headerEl ? headerEl.innerText : "Course Home";
  console.log(v_content_title);

  let v_modal = document.createElement("div");
  v_modal.setAttribute("id", "v_modal");
  v_modal.setAttribute("class", "v_modal_holder");

  let v_modal_container_HTML = "";
  let v_glossary_print_HTML =
    "<div id='v_print_glossary' style='display:none'><h1>" +
    v_content_title +
    " Glossary</h1>";

  v_modal_container_HTML +=
    '<div class="v_modal_close" id="v_modal_close_btn" onclick="closeModal()"><img src="lib/versado/icons/circle-xmark.svg" width="24" height="24" /></div>';
  v_modal_container_HTML += "<div class='v_modal_mobile_box'>";
  v_modal_container_HTML += "<h1>Glossary</h1>";
  v_modal_container_HTML +=
    '<div class="v_print_link" onclick="printGlossary()"><img src="lib/versado/icons/print.svg" width="18" height="18"/> Print Glossary</div>';

  for (let i = 0; i < allglossary.length; i++) {
    v_modal_container_HTML += "<div class='v_dict_row'>";
    v_modal_container_HTML +=
      "<div class='v_dict_term'>" + allglossary[i].term + "</div>";
    v_modal_container_HTML +=
      "<div class='v_dict_definition'>" + allglossary[i].definition + "</div>";
    v_modal_container_HTML += "</div>";

    v_glossary_print_HTML +=
      "<strong>" +
      allglossary[i].term +
      "</strong><br>" +
      allglossary[i].definition +
      "<br><br>";
  }

  v_modal_container_HTML += "</div>";
  v_glossary_print_HTML += "</div>";

  v_modal.innerHTML = v_modal_container_HTML + v_glossary_print_HTML;
  document.body.appendChild(v_modal);

  // Close when clicking the overlay (outside the modal box)
  v_modal.addEventListener("click", function (event) {
    if (event.target === v_modal) closeModal();
  });

  document.getElementsByTagName("main")[0];
}

function printGlossary() {
  console.log("Print all Glossary Terms");
  // Get a reference to the element you want to print
  const elementToPrint = document.getElementById("v_print_glossary");

  // Create a new window or iframe
  const printWindow = window.open();
  printWindow.title = v_content_title + "Glossary";

  // Write the contents of the element to the new window or iframe
  if (elementToPrint) {
    printWindow.document.write(elementToPrint.innerHTML);
  }

  // Call the print() method on the new window or iframe
  printWindow.print();
}

/**
 * onDomChange Polyfill
 */
(function (window) {
  var last = +new Date();
  var delay = 100; // default delay
  var stack = [];

  function callback() {
    var now = +new Date();
    if (now - last > delay) {
      for (var i = 0; i < stack.length; i++) {
        stack[i]();
      }
      last = now;
    }
  }

  var onDomChange = function (fn, newdelay) {
    if (newdelay) delay = newdelay;
    stack.push(fn);
  };

  function naive() {
    var last = document.getElementsByTagName("*");
    var lastlen = last.length;
    setTimeout(function check() {
      var current = document.getElementsByTagName("*");
      var len = current.length;
      if (len != lastlen) {
        last = [];
      }
      for (var i = 0; i < len; i++) {
        if (current[i] !== last[i]) {
          callback();
          last = current;
          lastlen = len;
          break;
        }
      }
      setTimeout(check, delay);
    }, delay);
  }

  var support = {};
  var el = document.documentElement;
  var remain = 3;

  function decide() {
    if (support.DOMNodeInserted) {
      window.addEventListener(
        "DOMContentLoaded",
        function () {
          if (support.DOMSubtreeModified) {
            el.addEventListener("DOMSubtreeModified", callback, false);
          } else {
            el.addEventListener("DOMNodeInserted", callback, false);
            el.addEventListener("DOMNodeRemoved", callback, false);
          }
        },
        false
      );
    } else if (document.onpropertychange) {
      document.onpropertychange = callback;
    } else {
      naive();
    }
  }

  function test(event) {
    el.addEventListener(
      event,
      function fn() {
        support[event] = true;
        el.removeEventListener(event, fn, false);
        if (--remain === 0) decide();
      },
      false
    );
  }

  if (window.addEventListener) {
    test("DOMSubtreeModified");
    test("DOMNodeInserted");
    test("DOMNodeRemoved");
  } else {
    decide();
  }

  var dummy = document.createElement("div");
  el.appendChild(dummy);
  el.removeChild(dummy);

  window.onDomChange = onDomChange;
})(window);
