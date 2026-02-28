// components/table.js
import { cloneTemplate } from "../lib/utils.js";

/**
 * Инициализирует таблицу и вызывает коллбэк при любых изменениях и нажатиях на кнопки
 *
 * @param {Object} settings
 * @param {(action: HTMLButtonElement | undefined) => void} onAction
 * @returns {{container: Node, elements: *, render: render}}
 */
export function initTable(settings, onAction) {
  const { tableTemplate, rowTemplate, before, after } = settings;
  const root = cloneTemplate(tableTemplate);

  // Вывести дополнительные шаблоны до и после таблицы
  if (before && before.length) {
    [...before].reverse().forEach((subName) => {
      try {
        root[subName] = cloneTemplate(subName);
        if (root[subName] && root[subName].container) {
          root.container.prepend(root[subName].container);
        }
      } catch (error) {
        console.error(`Failed to clone template ${subName}:`, error);
      }
    });
  }

  if (after && after.length) {
    after.forEach((subName) => {
      try {
        root[subName] = cloneTemplate(subName);
        if (root[subName] && root[subName].container) {
          root.container.append(root[subName].container);
        }
      } catch (error) {
        console.error(`Failed to clone template ${subName}:`, error);
      }
    });
  }

  // Обработать события и вызвать onAction()
  root.container.addEventListener("change", () => onAction());
  root.container.addEventListener("reset", () => setTimeout(() => onAction(), 0));
  root.container.addEventListener("submit", (e) => {
    e.preventDefault();
    onAction(e.submitter);
  });

  const render = (data) => {
    if (!data || !Array.isArray(data)) {
      console.warn('No data to render');
      return;
    }
    
    console.log(`Rendering ${data.length} rows`);
    
    // Преобразовать данные в массив строк на основе шаблона rowTemplate
    const nextRows = data.map((item) => {
      const row = cloneTemplate(rowTemplate);

      Object.keys(item).forEach((key) => {
        if (row.elements[key]) {
          let value = item[key];
          
          // Форматируем total как число с двумя знаками после запятой
          if (key === 'total' && typeof value === 'number') {
            value = value.toFixed(2);
          }
          
          row.elements[key].textContent = value || '';
        }
      });

      return row.container;
    });

    if (root.elements && root.elements.rows) {
      root.elements.rows.replaceChildren(...nextRows);
    }
  };

  return { ...root, render };
}