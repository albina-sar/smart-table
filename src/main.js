import './fonts/ys-display/fonts.css'
import './style.css'

import {data as sourceData} from "./data/dataset_1.js";

import {initData} from "./data.js";
import {processFormData} from "./lib/utils.js";

import {initTable} from "./components/table.js";
// @todo: подключение
import {initPagination} from "./components/pagination.js";
import {initSorting} from "./components/sorting.js";
import {initFiltering} from "./components/filtering.js";
import {initSearching} from "./components/searching.js";

// Исходные данные используемые в render()
const API = initData(sourceData);

/**
 * Сбор и обработка полей из таблицы
 * @returns {Object}
 */
function collectState() {
    const state = processFormData(new FormData(sampleTable.container));
    
    // Преобразуем числовые значения
    const rowsPerPage = parseInt(state.rowsPerPage);
    const page = parseInt(state.page ?? 1);
    
    return {
        ...state,
        rowsPerPage,
        page
    };
}

/**
 * Перерисовка состояния таблицы при любых изменениях
 * @param {HTMLButtonElement?} action
 */
async function render(action) {
    let state = collectState(); // состояние полей из таблицы
    let query = {}; // объект для параметров запроса
    
    // Применяем все компоненты к запросу
    query = applySearching(query, state, action); // применяем поиск к запросу
    query = applyFiltering(query, state, action); // применяем фильтрацию к запросу
    query = applySorting(query, state, action);   // применяем сортировку к запросу
    query = applyPagination(query, state, action); // применяем пагинацию к запросу

    // Получаем данные с сервера
    const { total, items } = await API.getRecords(query);
    
    // Обновляем пагинатор после получения данных
    updatePagination(total, query);
    
    // Отрисовываем таблицу с полученными данными
    sampleTable.render(items);
}

// Инициализация таблицы
const sampleTable = initTable({
    tableTemplate: 'table',
    rowTemplate: 'row',
    before: ['search', 'header', 'filter'],
    after: ['pagination']
}, render);

// @todo: инициализация
// Инициализация пагинации
const { applyPagination, updatePagination } = initPagination(
    sampleTable.pagination.elements,
    (el, page, isCurrent) => {
        const input = el.querySelector('input');
        const label = el.querySelector('span');
        input.value = page;
        input.checked = isCurrent;
        label.textContent = page;
        return el;
    }
);

// Инициализация сортировки
const applySorting = initSorting([
    sampleTable.header.elements.sortByDate,
    sampleTable.header.elements.sortByTotal
]);

// Инициализация фильтрации
const { applyFiltering, updateIndexes } = initFiltering(sampleTable.filter.elements);

// Инициализация поиска
const applySearching = initSearching('search');

const appRoot = document.querySelector('#app');
appRoot.appendChild(sampleTable.container);

// Асинхронная функция инициализации
async function init() {
    // Получаем индексы с сервера
    const indexes = await API.getIndexes();
    
    // Обновляем индексы в фильтре (заполняем селекты опциями)
    updateIndexes(sampleTable.filter.elements, {
        searchBySeller: indexes.sellers
    });
    
    console.log('Индексы получены:', indexes);
    
    // Возвращаем индексы для возможного использования
    return indexes;
}

// Запускаем инициализацию, затем рендер
init().then(render);
