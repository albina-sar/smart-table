// components/filtering.js
export function initFiltering(elements) {
  const updateIndexes = (elements, indexes) => {
    Object.keys(indexes).forEach((elementName) => {
      const select = elements[elementName];
      if (select) {
        // Добавляем обработчик ошибок для select
        select.addEventListener("error", (e) => {
          console.error("Error loading select options:", e);
        });

        // Очищаем существующие опции, кроме первой (пустой опции)
        while (select.options.length > 1) {
          select.remove(1);
        }

        // Добавляем новые опции
        try {
          Object.values(indexes[elementName]).forEach((name) => {
            if (name && typeof name === "string") {
              const el = document.createElement("option");
              el.textContent = name;
              el.value = name;
              select.appendChild(el);
            }
          });
        } catch (error) {
          console.error(`Error adding options to ${elementName}:`, error);

          // Добавляем опцию с ошибкой для информирования пользователя
          const errorOption = document.createElement("option");
          errorOption.textContent = "Error loading options";
          errorOption.value = "";
          errorOption.disabled = true;
          select.appendChild(errorOption);
        }
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

    // Логируем параметры фильтрации для отладки
    if (Object.keys(filter).length > 0) {
      console.log("Applying filters:", filter);
    }

    return Object.keys(filter).length
      ? Object.assign({}, query, filter)
      : query;
  };

  // Функция для сброса всех фильтров
  const resetFilters = () => {
    Object.keys(elements).forEach((key) => {
      const element = elements[key];
      if (element && ["INPUT", "SELECT"].includes(element.tagName)) {
        if (element.tagName === "SELECT") {
          element.selectedIndex = 0;
        } else {
          element.value = "";
        }
      }
    });
  };

  // Функция для получения текущих значений фильтров
  const getFilterValues = () => {
    const values = {};
    Object.keys(elements).forEach((key) => {
      const element = elements[key];
      if (
        element &&
        ["INPUT", "SELECT"].includes(element.tagName) &&
        element.value
      ) {
        values[key] = element.value;
      }
    });
    return values;
  };

  return {
    updateIndexes,
    applyFiltering,
    resetFilters,
    getFilterValues,
  };
}
