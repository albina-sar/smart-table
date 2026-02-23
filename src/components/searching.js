// Удаляем импорт compare.js, так как он больше не нужен
// import {rules, createComparison} from "../lib/compare.js";

export function initSearching(searchField) {
    // @todo: #5.1 — настроить компаратор (удалено, так как используется серверный поиск)
    
    // Возвращаем функцию, которая формирует параметры поиска для запроса
    return (query, state, action) => {
        // @todo: #5.2 — применить компаратор (заменено на формирование параметров запроса)
        
        // Проверяем, что в поле поиска было что-то введено
        if (state[searchField] && state[searchField].trim() !== '') {
            // Устанавливаем в query параметр search
            return Object.assign({}, query, {
                search: state[searchField]
            });
        }
        
        // Если поле с поиском пустое, просто возвращаем query без изменений
        return query;
    };
}