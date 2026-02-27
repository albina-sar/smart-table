// components/filtering.js
export function initFiltering(elements) {
  const updateIndexes = (elements, indexes) => {
    if (!elements || !indexes) return;
    
    Object.keys(indexes).forEach((elementName) => {
      const select = elements[elementName];
      if (select && select.tagName === 'SELECT') {
        // Очищаем существующие опции, кроме первой
        while (select.options.length > 1) {
          select.remove(1);
        }

        // Добавляем новые опции
        const options = indexes[elementName];
        if (options && typeof options === 'object') {
          Object.values(options).forEach((name) => {
            if (name && typeof name === 'string') {
              const el = document.createElement("option");
              el.textContent = name;
              el.value = name;
              select.appendChild(el);
            }
          });
        }
      }
    });
  };

  const applyFiltering = (query, state, action) => {
    // Обрабатываем очистку поля
    if (action && action.name === "clear") {
      const parent = action.closest(".filter-wrapper");
      if (parent) {
        const input = parent.querySelector("input");
        if (input) {
          input.value = "";
          if (action.dataset && action.dataset.field) {
            state[action.dataset.field] = "";
          }
        }
      }
    }

    // Формируем параметры фильтрации
    const filter = {};
    
    if (elements) {
      Object.keys(elements).forEach((key) => {
        const element = elements[key];
        if (element) {
          // Проверяем, является ли элемент полем ввода фильтра
          const isFilterField = [
            "searchByDate",
            "searchByCustomer",
            "searchBySeller",
            "totalFrom",
            "totalTo",
          ].includes(key);

          if (
            isFilterField &&
            element.tagName &&
            ["INPUT", "SELECT"].includes(element.tagName) &&
            element.value &&
            element.value.trim() !== ""
          ) {
            // Для числовых полей проверяем, что значение действительно число
            if (key === "totalFrom" || key === "totalTo") {
              const numValue = Number(element.value);
              if (!isNaN(numValue)) {
                filter[`filter[${element.name}]`] = numValue;
              }
            } else {
              filter[`filter[${element.name}]`] = element.value.trim();
            }
          }
        }
      });
    }

    return Object.keys(filter).length > 0
      ? { ...query, ...filter }
      : query;
  };

  return {
    updateIndexes,
    applyFiltering,
  };
}
