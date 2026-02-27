// main.js
import { data as sourceData } from "./data/dataset_1.js";
import { initData } from "./data.js";
import { processFormData } from "./lib/utils.js";
import { initTable } from "./components/table.js";
import { initPagination } from "./components/pagination.js";
import { initSorting } from "./components/sorting.js";
import { initFiltering } from "./components/filtering.js";
import { initSearching } from "./components/searching.js";

// Инициализация API
const api = initData(sourceData);

/**
 * Сбор и обработка полей из таблицы
 * @returns {Object}
 */
function collectState() {
  const form = document.forms.table;
  if (!form) return { rowsPerPage: 10, page: 1 };
  
  const state = processFormData(new FormData(form));

  // Преобразуем числовые значения
  const rowsPerPage = parseInt(state.rowsPerPage) || 10;
  const page = parseInt(state.page) || 1;

  return {
    ...state,
    rowsPerPage,
    page,
  };
}

/**
 * Перерисовка состояния таблицы при любых изменениях
 * @param {HTMLButtonElement?} action
 */
async function render(action) {
  try {
    console.log('Rendering table with action:', action);
    
    let state = collectState();
    let query = {};

    // Применяем все компоненты
    query = applySearching(query, state, action);
    query = applyFiltering(query, state, action);
    query = applySorting(query, state, action);
    query = applyPagination(query, state, action);

    console.log('Query:', query);

    // Получаем данные
    const { total, items } = await api.getRecords(query);

    console.log(`Received ${items.length} items, total: ${total}`);

    // Обновляем пагинатор
    if (updatePagination) {
      updatePagination(total, query);
    }

    if (sampleTable && sampleTable.render) {
      sampleTable.render(items);
    }
  } catch (error) {
    console.error('Error rendering table:', error);
  }
}

// Инициализация таблицы
const sampleTable = initTable(
  {
    tableTemplate: "table",
    rowTemplate: "row",
    before: ["search", "header", "filter"],
    after: ["pagination"],
  },
  render,
);

// Проверяем, что все необходимые элементы существуют
if (!sampleTable || !sampleTable.pagination || !sampleTable.pagination.elements) {
  console.error('Failed to initialize table components');
}

const { applyPagination, updatePagination } = initPagination(
  sampleTable.pagination?.elements || {},
  (el, page, isCurrent) => {
    if (!el) return el;
    
    const input = el.querySelector("input");
    const label = el.querySelector("span");
    
    if (input && label) {
      input.value = page;
      input.checked = isCurrent;
      label.textContent = page;
    }
    
    return el;
  },
);

const applySorting = initSorting([
  sampleTable.header?.elements?.sortByDate,
  sampleTable.header?.elements?.sortByTotal,
].filter(Boolean));

const { applyFiltering, updateIndexes } = initFiltering(
  sampleTable.filter?.elements || {},
);

const applySearching = initSearching("search");

const appRoot = document.querySelector("#app");
if (appRoot) {
  appRoot.appendChild(sampleTable.container);
}

// Асинхронная функция инициализации
async function init() {
  try {
    console.log('Initializing application...');
    
    // Получаем индексы
    const indexes = await api.getIndexes();
    console.log('Received indexes:', indexes);

    // Обновляем селекты фильтров
    if (indexes && indexes.sellers) {
      updateIndexes(sampleTable.filter?.elements || {}, {
        searchBySeller: indexes.sellers,
      });
    }

    // Запускаем первый рендер
    await render();
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Запускаем приложение
init();