// main.js
import { data as sourceData } from "./data/dataset_1.js";
import { initData } from "./data.js";
import { processFormData } from "./lib/utils.js";
import { initTable } from "./components/table.js";
import { initPagination } from "./components/pagination.js";
import { initSorting } from "./components/sorting.js";
import { initFiltering } from "./components/filtering.js";
import { initSearching } from "./components/searching.js";

// Добавляем индикатор загрузки
const loadingTemplate = `
  <div class="loading-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;">
    <div class="loading-spinner" style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3F5AA4; border-radius: 50%; animation: spin 1s linear infinite;"></div>
  </div>
  <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
`;

// Инициализация API
const api = initData(sourceData);

/**
 * Сбор и обработка полей из таблицы
 * @returns {Object}
 */
function collectState() {
  const state = processFormData(new FormData(sampleTable.container));

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
  // Показываем индикатор загрузки
  showLoading(true);

  try {
    let state = collectState();
    let query = {};

    // Применяем все компоненты
    query = applySearching(query, state, action);
    query = applyFiltering(query, state, action);
    query = applySorting(query, state, action);
    query = applyPagination(query, state, action);

    // Получаем данные с сервера
    const { total, items } = await api.getRecords(query);

    // Обновляем пагинатор
    updatePagination(total, query);

    sampleTable.render(items);
  } catch (error) {
    console.error("Error rendering table:", error);
    // Здесь можно показать сообщение об ошибке пользователю
  } finally {
    // Скрываем индикатор загрузки
    showLoading(false);
  }
}

// Функция для управления индикатором загрузки
function showLoading(show) {
  let overlay = document.querySelector(".loading-overlay");
  if (!overlay && show) {
    const appRoot = document.querySelector("#app");
    appRoot.insertAdjacentHTML("beforeend", loadingTemplate);
    overlay = document.querySelector(".loading-overlay");
    appRoot.style.position = "relative";
  }
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
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

const { applyPagination, updatePagination } = initPagination(
  sampleTable.pagination.elements,
  (el, page, isCurrent) => {
    const input = el.querySelector("input");
    const label = el.querySelector("span");
    input.value = page;
    input.checked = isCurrent;
    label.textContent = page;
    return el;
  },
);

const applySorting = initSorting([
  sampleTable.header.elements.sortByDate,
  sampleTable.header.elements.sortByTotal,
]);

const { applyFiltering, updateIndexes } = initFiltering(
  sampleTable.filter.elements,
);

const applySearching = initSearching("search");

const appRoot = document.querySelector("#app");
appRoot.appendChild(sampleTable.container);

// Асинхронная функция инициализации
async function init() {
  showLoading(true);

  try {
    // Получаем индексы с сервера
    const indexes = await api.getIndexes();

    // Обновляем селекты фильтров
    updateIndexes(sampleTable.filter.elements, {
      searchBySeller: indexes.sellers,
    });

    // Запускаем первый рендер
    await render();
  } catch (error) {
    console.error("Error initializing app:", error);
    // Показываем сообщение об ошибке
    const errorMessage = document.createElement("div");
    errorMessage.className = "error-message";
    errorMessage.style.cssText =
      "padding: 20px; text-align: center; color: red;";
    errorMessage.textContent = "Failed to load data. Please try again later.";
    appRoot.appendChild(errorMessage);
  } finally {
    showLoading(false);
  }
}

// Запускаем приложение
init().then(() => {
  console.log("Application started");
});