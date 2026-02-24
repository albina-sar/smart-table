// main.js
import {initData} from "./data.js";
import {initTable} from "./components/table.js";
import {initPagination} from "./components/pagination.js";
import {initFiltering} from "./components/filtering.js";
import {initSearching} from "./components/searching.js";
import {initSorting} from "./components/sorting.js";
import {cloneTemplate, processFormData} from "./lib/utils.js";

// Получаем все шаблоны и создаем корневой элемент таблицы
const app = document.getElementById('app');
const tableRoot = cloneTemplate('table');
app.appendChild(tableRoot.container);

// Добавляем поиск сверху
const searchRoot = cloneTemplate('search');
tableRoot.container.prepend(searchRoot.container);

// Добавляем пагинацию снизу
const paginationRoot = cloneTemplate('pagination');
tableRoot.container.appendChild(paginationRoot.container);

// Получаем элементы управления
const filterElements = tableRoot.filter.elements;
const paginationElements = paginationRoot.elements;

// Инициализируем API
const sourceData = []; // Пустой массив, данные будем получать с сервера
const api = initData(sourceData);

// Инициализируем компоненты
const sampleTable = initTable({
    tableTemplate: 'table',
    rowTemplate: 'row',
    before: ['search', 'header'],
    after: ['pagination']
}, (action) => render(action));

const {applyPagination, updatePagination} = initPagination(paginationElements, (el, pageNumber, isActive) => {
    const clone = el.cloneNode(true);
    const radio = clone.querySelector('input');
    radio.value = pageNumber;
    radio.checked = isActive;
    const span = clone.querySelector('span');
    span.textContent = pageNumber;
    return clone;
});

const {applyFiltering, updateIndexes} = initFiltering(filterElements);

const applySearching = initSearching('search');

const sortButtons = {
    date: sampleTable.elements.sortByDate,
    total: sampleTable.elements.sortByTotal
};
const applySorting = initSorting(Object.values(sortButtons));

// Вспомогательная функция для сбора состояния формы
function collectState() {
    const formData = new FormData(tableRoot.elements.table);
    return processFormData(formData);
}

// Асинхронная функция рендера
async function render(action) {
    let state = collectState(); // состояние полей из таблицы
    let query = {}; // здесь будут формироваться параметры запроса
    
    // Применяем все трансформации к query
    query = applyPagination(query, state, action);
    query = applyFiltering(query, state, action);
    query = applySearching(query, state, action);
    query = applySorting(query, state, action);
    
    // Запрашиваем данные с сервера
    const { total, items } = await api.getRecords(query);
    
    // Обновляем пагинатор и отображаем данные
    updatePagination(total, query);
    sampleTable.render(items);
}

// Асинхронная функция инициализации
async function init() {
    const indexes = await api.getIndexes();
    
    updateIndexes(sampleTable.filter.elements, {
        searchBySeller: indexes.sellers
    });
    
    await render();
}

// Запускаем приложение
init().then(() => {
    console.log('Application started');
});