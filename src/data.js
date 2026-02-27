// data.js
import { makeIndex } from "./lib/utils.js";

const BASE_URL = "https://webinars.webdev.education-services.ru/sp7-api";

export function initData(sourceData) {
  // Переменные для кеширования данных
  let sellers;
  let customers;
  let lastResult;
  let lastQuery;

  // Кеш для запросов
  const queryCache = new Map();

  // Функция для создания индексов из массива объектов
  const createIndex = (array, idField, formatter) => {
    return array.reduce((acc, item) => {
      acc[item[idField]] = formatter ? formatter(item) : item;
      return acc;
    }, {});
  };

  // функция для приведения строк в тот вид, который нужен нашей таблице
  const mapRecords = (data) =>
    data.map((item) => ({
      id: item.receipt_id,
      date: item.date,
      seller: sellers[item.seller_id],
      customer: customers[item.customer_id],
      total: item.total_amount,
    }));

  // Функция для получения данных с сервера
  const fetchFromServer = async (endpoint, params = {}) => {
    const url = new URL(`${BASE_URL}${endpoint}`);

    // Добавляем параметры запроса
    Object.keys(params).forEach((key) => {
      if (
        params[key] !== undefined &&
        params[key] !== null &&
        params[key] !== ""
      ) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      throw error;
    }
  };

  // функция получения индексов с сервера
  const getIndexes = async () => {
    // Используем кеш, если данные уже загружены
    if (sellers && customers) {
      // Преобразуем индексы в формат для отображения в селектах
      const sellerOptions = {};
      const customerOptions = {};

      Object.values(sellers).forEach((name) => {
        sellerOptions[name] = name;
      });

      Object.values(customers).forEach((name) => {
        customerOptions[name] = name;
      });

      return {
        sellers: sellerOptions,
        customers: customerOptions,
      };
    }

    try {
      // Загружаем данные с сервера параллельно
      const [sellersData, customersData] = await Promise.all([
        fetchFromServer("/sellers"),
        fetchFromServer("/customers"),
      ]);

      // Создаем индексы
      sellers = createIndex(
        sellersData,
        "id",
        (v) => `${v.first_name} ${v.last_name}`,
      );

      customers = createIndex(
        customersData,
        "id",
        (v) => `${v.first_name} ${v.last_name}`,
      );

      // Преобразуем индексы в формат для отображения в селектах
      const sellerOptions = {};
      const customerOptions = {};

      Object.values(sellers).forEach((name) => {
        sellerOptions[name] = name;
      });

      Object.values(customers).forEach((name) => {
        customerOptions[name] = name;
      });

      return {
        sellers: sellerOptions,
        customers: customerOptions,
      };
    } catch (error) {
      console.error("Failed to fetch indexes:", error);

      // Fallback на локальные данные в случае ошибки
      console.warn("Falling back to local data");

      sellers = createIndex(
        sourceData.sellers,
        "id",
        (v) => `${v.first_name} ${v.last_name}`,
      );
      customers = createIndex(
        sourceData.customers,
        "id",
        (v) => `${v.first_name} ${v.last_name}`,
      );

      const sellerOptions = {};
      const customerOptions = {};

      Object.values(sellers).forEach((name) => {
        sellerOptions[name] = name;
      });

      Object.values(customers).forEach((name) => {
        customerOptions[name] = name;
      });

      return {
        sellers: sellerOptions,
        customers: customerOptions,
      };
    }
  };

  // функция получения записей с сервера
  const getRecords = async (query) => {
    const qs = new URLSearchParams(query);
    const nextQuery = qs.toString();

    // Проверяем кеш
    const cacheKey = JSON.stringify(query);
    if (queryCache.has(cacheKey)) {
      console.log("Returning cached result for:", cacheKey);
      return queryCache.get(cacheKey);
    }

    try {
      // Получаем данные с сервера
      const response = await fetchFromServer("/purchases", query);

      // Получаем индексы, если их еще нет
      if (!sellers || !customers) {
        await getIndexes();
      }

      lastQuery = nextQuery;
      lastResult = {
        total: response.total || 0,
        items: response.items ? mapRecords(response.items) : [],
      };

      // Сохраняем в кеш
      queryCache.set(cacheKey, lastResult);

      // Очищаем старые записи кеша (оставляем последние 50)
      if (queryCache.size > 50) {
        const firstKey = queryCache.keys().next().value;
        queryCache.delete(firstKey);
      }

      return lastResult;
    } catch (error) {
      console.error("Failed to fetch records:", error);

      // Fallback на локальную фильтрацию в случае ошибки
      console.warn("Falling back to local data filtering");

      // Получаем индексы, если их еще нет
      if (!sellers || !customers) {
        await getIndexes();
      }

      // Фильтруем записи локально
      let filteredRecords = filterRecords(sourceData.purchase_records, query);

      // Сортируем записи
      if (query.sort) {
        filteredRecords = sortRecords(filteredRecords, query.sort);
      }

      // Применяем пагинацию
      const limit = Number(query.limit) || 10;
      const page = Number(query.page) || 1;
      const start = (page - 1) * limit;
      const end = start + limit;

      const paginatedRecords = filteredRecords.slice(start, end);

      lastQuery = nextQuery;
      lastResult = {
        total: filteredRecords.length,
        items: mapRecords(paginatedRecords),
      };

      // Сохраняем в кеш
      queryCache.set(cacheKey, lastResult);

      return lastResult;
    }
  };

  // Функция фильтрации записей на клиенте (для fallback-режима)
  const filterRecords = (records, query) => {
    return records.filter((record) => {
      // Поиск по всем полям
      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        const sellerName = sellers[record.seller_id]?.toLowerCase() || "";
        const customerName = customers[record.customer_id]?.toLowerCase() || "";

        const matchesSearch =
          record.date.includes(searchTerm) ||
          sellerName.includes(searchTerm) ||
          customerName.includes(searchTerm) ||
          record.total_amount.toString().includes(searchTerm);

        if (!matchesSearch) return false;
      }

      // Фильтр по дате
      if (
        query["filter[date]"] &&
        !record.date.includes(query["filter[date]"])
      ) {
        return false;
      }

      // Фильтр по покупателю
      if (query["filter[customer]"]) {
        const customerName = customers[record.customer_id] || "";
        if (
          !customerName
            .toLowerCase()
            .includes(query["filter[customer]"].toLowerCase())
        ) {
          return false;
        }
      }

      // Фильтр по продавцу
      if (query["filter[seller]"]) {
        const sellerName = sellers[record.seller_id] || "";
        if (sellerName !== query["filter[seller]"]) {
          return false;
        }
      }

      // Фильтр по сумме (от)
      if (
        query["filter[totalFrom]"] &&
        record.total_amount < Number(query["filter[totalFrom]"])
      ) {
        return false;
      }

      // Фильтр по сумме (до)
      if (
        query["filter[totalTo]"] &&
        record.total_amount > Number(query["filter[totalTo]"])
      ) {
        return false;
      }

      return true;
    });
  };

  // Функция сортировки записей на клиенте (для fallback-режима)
  const sortRecords = (records, sortParam) => {
    if (!sortParam) return records;

    const [field, order] = sortParam.split(":");

    return [...records].sort((a, b) => {
      let valueA, valueB;

      if (field === "date") {
        valueA = new Date(a.date).getTime();
        valueB = new Date(b.date).getTime();
      } else if (field === "total") {
        valueA = a.total_amount;
        valueB = b.total_amount;
      } else {
        return 0;
      }

      if (order === "up") {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  };

  return {
    getIndexes,
    getRecords,
  };
}