// Удаляем импорт compare.js, так как он больше не нужен
// import {createComparison, defaultRules} from "../lib/compare.js";

export function initFiltering(elements) {
    // Функция для обновления индексов (заполнения селектов опциями)
    const updateIndexes = (elements, indexes) => {
        Object.keys(indexes).forEach((elementName) => {
            elements[elementName].append(...Object.values(indexes[elementName]).map(name => {
                const el = document.createElement('option');
                el.textContent = name;
                el.value = name;
                return el;
            }))
        });
    };

    // Функция для применения фильтрации к запросу
    const applyFiltering = (query, state, action) => {
        // @todo: #4.2 — обработать очистку поля
        if (action && action.name === 'clear') {
            const parent = action.closest('.filter-wrapper');
            const input = parent.querySelector('input');
            input.value = '';
            state[action.dataset.field] = '';
        }

        // @todo: #4.5 — отфильтровать данные, используя компаратор
        const filter = {};
        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                // Ищем поля ввода в фильтре с непустыми данными
                if (['INPUT', 'SELECT'].includes(elements[key].tagName) && elements[key].value) {
                    // Чтобы сформировать в query вложенный объект фильтра
                    filter[`filter[${elements[key].name}]`] = elements[key].value;
                }
            }
        });

        // Если в фильтре что-то добавилось, применим к запросу
        return Object.keys(filter).length ? Object.assign({}, query, filter) : query;
    };

    return {
        updateIndexes,
        applyFiltering
    };
}