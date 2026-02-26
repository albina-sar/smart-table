// components/filtering.js
export function initFiltering(elements) {
  const updateIndexes = (elements, indexes) => {
    Object.keys(indexes).forEach((elementName) => {
      const select = elements[elementName];
      if (select) {
        // Очищаем существующие опции, кроме первой
        while (select.options.length > 1) {
          select.remove(1);
        }

        // Добавляем новые опции
        Object.values(indexes[elementName]).forEach((name) => {
          const el = document.createElement("option");
          el.textContent = name;
          el.value = name;
          select.appendChild(el);
        });
      }
    });
  };

  const applyFiltering = (query, state, action) => {
    // Обрабатываем очистку поля
    if (action && action.name === "clear") {
      const parent = action.closest(".filter-wrapper");
      const input = parent.querySelector("input");
      if (input) {
        input.value = "";
        state[action.dataset.field] = "";
      }
    }

    // Формируем параметры фильтрации
    const filter = {};
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
          ["INPUT", "SELECT"].includes(element.tagName) &&
          element.value
        ) {
          filter[`filter[${element.name}]`] = element.value;
        }
      }
    });

    return Object.keys(filter).length
      ? Object.assign({}, query, filter)
      : query;
  };

  return {
    updateIndexes,
    applyFiltering,
  };
}
