(function () {
  var READY_ATTR = "data-drsam-table-filters-ready";
  var FILTER_CLASS = "drsam-table-filter-hidden";
  var EMPTY_VALUE = "__DRSAM_EMPTY__";
  var activeMenu = null;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function valueKey(value) {
    var text = normalizeText(value);
    return text === "" ? EMPTY_VALUE : text;
  }

  function valueLabel(value) {
    return value === EMPTY_VALUE ? "(Vacios)" : value;
  }

  function getHeaderLabel(th) {
    var clone = th.cloneNode(true);
    clone.querySelectorAll("button, input, select, textarea, script, style").forEach(function (node) {
      node.remove();
    });
    return normalizeText(clone.textContent);
  }

  function isHeaderCellFilterable(cell) {
    return cell.tagName === "TH"
      && cell.colSpan === 1
      && cell.rowSpan === 1
      && !cell.hasAttribute("data-drsam-table-filter-skip-column")
      && getHeaderLabel(cell) !== "";
  }

  function rowHasFieldControls(row) {
    return !!row.querySelector("input:not([type='hidden']), select, textarea");
  }

  function isLegacyFilterRow(row) {
    return rowHasFieldControls(row) || row.matches(".institution-table-filter-row, .unit-native-filter-row, .doctor-patients-filters");
  }

  function getHeaderRow(table) {
    var rows = Array.prototype.slice.call(table.tHead ? table.tHead.rows : []);
    return rows.find(function (row) {
      if (isLegacyFilterRow(row)) return false;
      return Array.prototype.filter.call(row.cells, isHeaderCellFilterable).length > 0;
    }) || null;
  }

  function hasComplexHeader(table) {
    return Array.prototype.some.call(table.tHead.rows, function (row) {
      if (isLegacyFilterRow(row)) return false;
      return Array.prototype.some.call(row.cells, function (cell) {
        return cell.colSpan > 1 || cell.rowSpan > 1;
      });
    });
  }

  function hideLegacyFilterRows(table, headerRow) {
    Array.prototype.forEach.call(table.tHead.rows, function (row) {
      if (row !== headerRow && isLegacyFilterRow(row)) {
        row.hidden = true;
      }
    });
  }

  function getCellValue(row, columnIndex) {
    var cell = row.cells[columnIndex];
    if (!cell) return EMPTY_VALUE;

    var formValues = Array.prototype.map.call(
      cell.querySelectorAll("input:not([type='hidden']), select, textarea"),
      function (field) {
        if (field.tagName === "SELECT") {
          return field.options[field.selectedIndex] ? field.options[field.selectedIndex].text : field.value;
        }
        if (field.type === "checkbox" || field.type === "radio") {
          return field.checked ? "Seleccionado" : "No seleccionado";
        }
        return field.value;
      }
    ).filter(Boolean);

    var text = formValues.length ? formValues.join(" ") : cell.innerText;
    return valueKey(text);
  }

  function isFilterableTable(table) {
    if (!table || table.hasAttribute(READY_ATTR)) return false;
    if (!table.tHead || !table.tBodies.length) return false;
    if (table.closest("[data-drsam-table-filter-skip]")) return false;
    if (table.closest("form")) return false;
    if (table.classList.contains("doctor-prescription-table")) return false;
    if (table.classList.contains("superadmin-oncology-table")) return false;
    if (table.tBodies[0].querySelector("input:not([type='hidden']), select, textarea")) return false;
    if (hasComplexHeader(table)) return false;

    var headerRow = getHeaderRow(table);
    var headers = headerRow ? Array.prototype.filter.call(headerRow.cells, isHeaderCellFilterable) : [];
    var rows = Array.prototype.filter.call(table.tBodies[0].rows, function (row) {
      return row.cells.length > 1;
    });

    return headers.length > 0 && rows.length > 0;
  }

  function getTableState(table) {
    if (!table.__drsamTableFilterState) {
      table.__drsamTableFilterState = {
        filters: new Map(),
        buttons: new Map()
      };
    }
    return table.__drsamTableFilterState;
  }

  function getRows(table) {
    return Array.prototype.filter.call(table.tBodies[0].rows, function (row) {
      return row.cells.length > 1;
    });
  }

  function getColumnValues(table, columnIndex) {
    var seen = new Set();
    getRows(table).forEach(function (row) {
      seen.add(getCellValue(row, columnIndex));
    });

    return Array.from(seen).sort(function (first, second) {
      return valueLabel(first).localeCompare(valueLabel(second), "es", { numeric: true, sensitivity: "base" });
    });
  }

  function updateButtons(table) {
    var state = getTableState(table);
    state.buttons.forEach(function (button, index) {
      var active = state.filters.has(index);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function applyFilters(table) {
    var state = getTableState(table);
    getRows(table).forEach(function (row) {
      var visible = true;
      state.filters.forEach(function (selectedValues, columnIndex) {
        if (!selectedValues.has(getCellValue(row, columnIndex))) {
          visible = false;
        }
      });
      row.classList.toggle(FILTER_CLASS, !visible);
    });
    updateButtons(table);
  }

  function closeMenu() {
    if (!activeMenu) return;
    activeMenu.button.setAttribute("aria-expanded", "false");
    activeMenu.node.remove();
    document.removeEventListener("pointerdown", activeMenu.outsideHandler, true);
    document.removeEventListener("keydown", activeMenu.keyHandler, true);
    window.removeEventListener("resize", activeMenu.closeHandler, true);
    window.removeEventListener("scroll", activeMenu.closeHandler, true);
    activeMenu = null;
  }

  function positionMenu(menu, button) {
    var rect = button.getBoundingClientRect();
    var width = Math.min(260, Math.max(220, menu.offsetWidth || 236));
    var left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    var top = Math.min(rect.bottom + 6, window.innerHeight - Math.min(menu.offsetHeight || 320, 320) - 8);

    menu.style.width = width + "px";
    menu.style.left = left + "px";
    menu.style.top = Math.max(8, top) + "px";
  }

  function createValueOption(value, checked) {
    var label = document.createElement("label");
    label.className = "drsam-table-filter-option";
    label.dataset.filterLabel = valueLabel(value).toLocaleLowerCase("es");

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.checked = checked;

    var text = document.createElement("span");
    text.textContent = valueLabel(value);

    label.append(checkbox, text);
    return label;
  }

  function openMenu(table, columnIndex, button) {
    if (activeMenu && activeMenu.button === button) {
      closeMenu();
      return;
    }

    closeMenu();

    var state = getTableState(table);
    var values = getColumnValues(table, columnIndex);
    var activeValues = state.filters.get(columnIndex);
    var allSelected = !activeValues || activeValues.size === values.length;

    var menu = document.createElement("div");
    menu.className = "drsam-table-filter-menu";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", "Filtrar columna");

    var search = document.createElement("input");
    search.type = "search";
    search.className = "drsam-table-filter-search";
    search.placeholder = "Buscar (Todos)";

    var options = document.createElement("div");
    options.className = "drsam-table-filter-options";

    var allLabel = createValueOption("(Todos)", allSelected);
    allLabel.classList.add("is-all");
    allLabel.querySelector("input").dataset.filterAll = "true";
    options.appendChild(allLabel);

    values.forEach(function (value) {
      options.appendChild(createValueOption(value, allSelected || activeValues.has(value)));
    });

    var footer = document.createElement("div");
    footer.className = "drsam-table-filter-footer";

    var accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = "Aceptar";

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancelar";

    footer.append(accept, cancel);
    menu.append(search, options, footer);
    document.body.appendChild(menu);
    positionMenu(menu, button);
    button.setAttribute("aria-expanded", "true");
    search.focus({ preventScroll: true });

    var outsideHandler = function (event) {
      if (!menu.contains(event.target) && event.target !== button) closeMenu();
    };
    var keyHandler = function (event) {
      if (event.key === "Escape") closeMenu();
    };
    var closeHandler = function () { closeMenu(); };

    activeMenu = { node: menu, button: button, outsideHandler: outsideHandler, keyHandler: keyHandler, closeHandler: closeHandler };
    document.addEventListener("pointerdown", outsideHandler, true);
    document.addEventListener("keydown", keyHandler, true);
    window.addEventListener("resize", closeHandler, true);
    window.addEventListener("scroll", closeHandler, true);

    search.addEventListener("input", function () {
      var term = search.value.trim().toLocaleLowerCase("es");
      options.querySelectorAll(".drsam-table-filter-option:not(.is-all)").forEach(function (label) {
        label.hidden = term !== "" && !label.dataset.filterLabel.includes(term);
      });
    });

    options.addEventListener("change", function (event) {
      var checkbox = event.target;
      if (!(checkbox instanceof HTMLInputElement)) return;

      var valueCheckboxes = Array.prototype.filter.call(options.querySelectorAll("input[type='checkbox']"), function (input) {
        return !input.dataset.filterAll;
      });
      var allCheckbox = options.querySelector("[data-filter-all]");

      if (checkbox.dataset.filterAll) {
        valueCheckboxes.forEach(function (input) { input.checked = checkbox.checked; });
        return;
      }

      allCheckbox.checked = valueCheckboxes.every(function (input) { return input.checked; });
    });

    accept.addEventListener("click", function () {
      var selected = Array.prototype.filter.call(options.querySelectorAll(".drsam-table-filter-option:not(.is-all) input"), function (input) {
        return input.checked;
      }).map(function (input) {
        return input.value;
      });

      if (selected.length === values.length) {
        state.filters.delete(columnIndex);
      } else {
        state.filters.set(columnIndex, new Set(selected));
      }

      applyFilters(table);
      closeMenu();
    });

    cancel.addEventListener("click", closeMenu);
  }

  function ensureHeadContent(th) {
    th.querySelectorAll(".institution-table-head-buttons").forEach(function (legacyButtons) {
      legacyButtons.remove();
    });

    var existing = th.querySelector(":scope > .drsam-table-filter-head, :scope > .institution-table-head-control");
    if (existing) {
      existing.classList.add("drsam-table-filter-head");
      var label = existing.querySelector(":scope > span:first-child");
      if (label) label.classList.add("drsam-table-filter-label");
      return existing;
    }

    var wrapper = document.createElement("div");
    wrapper.className = "drsam-table-filter-head";

    var label = document.createElement("span");
    label.className = "drsam-table-filter-label";

    while (th.firstChild) {
      label.appendChild(th.firstChild);
    }

    wrapper.appendChild(label);
    th.appendChild(wrapper);
    return wrapper;
  }

  function initTable(table) {
    if (!isFilterableTable(table)) return;

    table.setAttribute(READY_ATTR, "true");
    var headerRow = getHeaderRow(table);
    if (!headerRow) return;
    hideLegacyFilterRows(table, headerRow);

    var state = getTableState(table);
    Array.prototype.forEach.call(headerRow.cells, function (th, index) {
      if (!isHeaderCellFilterable(th)) return;

      var head = ensureHeadContent(th);
      th.classList.add("drsam-table-filter-cell");

      var button = document.createElement("button");
      button.type = "button";
      button.className = "drsam-table-filter-button";
      button.setAttribute("aria-label", "Filtrar " + getHeaderLabel(th));
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-pressed", "false");

      head.appendChild(button);
      state.buttons.set(index, button);
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openMenu(table, index, button);
      });
    });
  }

  function initAllTables(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll("table"), initTable);
  }

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  ready(function () {
    initAllTables(document);

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!(node instanceof Element)) return;
          if (node.matches("table")) initTable(node);
          initAllTables(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
