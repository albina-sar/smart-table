// components/pagination.js
import {getPages} from "../lib/utils.js";

export const initPagination = ({pages, fromRow, toRow, totalRows}, createPage) => {
    // Подготавливаем шаблон кнопки для страницы и очищаем контейнер
    const pageTemplate = pages.firstElementChild.cloneNode(true);
    pages.innerHTML = '';
    
    let pageCount;

    const applyPagination = (query, state, action) => {
        const limit = state.rowsPerPage;
        let page = state.page;

        // Обрабатываем действия
        if (action) switch(action.name) {
            case 'prev': 
                page = Math.max(1, page - 1); 
                break;
            case 'next': 
                page = Math.min(pageCount, page + 1); 
                break;
            case 'first': 
                page = 1; 
                break;
            case 'last': 
                page = pageCount; 
                break;
        }

        return Object.assign({}, query, { // добавим параметры к query, но не изменяем исходный объект
            limit,
            page
        });
    }

    const updatePagination = (total, { page, limit }) => {
        pageCount = Math.ceil(total / limit);

        // Получаем список видимых страниц и выводим их
        const visiblePages = getPages(page, pageCount, 5);
        pages.replaceChildren(...visiblePages.map(pageNumber => {
            return createPage(pageTemplate, pageNumber, pageNumber === page);
        }));

        // Обновляем статус пагинации
        fromRow.textContent = total ? (page - 1) * limit + 1 : 0;
        toRow.textContent = Math.min((page * limit), total);
        totalRows.textContent = total;
    }

    return {
        updatePagination,
        applyPagination
    };
}