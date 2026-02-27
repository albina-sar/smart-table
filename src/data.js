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
  const mapRecords = (data) => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map((item) => ({
      id: item.receipt_id,
      date: item.date,
      seller: sellers ? sellers[item.seller_id] : item.seller_id,
      customer: customers ? customers[item.customer_id] : item.customer_id,
      total: item.total_amount,
    }));
  };

  // Функция для получения данных с сервера
  const fetchFromServer = async (endpoint, params = {}) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    
    // Добавляем параметры запроса
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
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
      throw error; // Пробрасываем ошибку дальше для обработки
    }
  };

  // функция получения индексов с сервера
  const getIndexes = async () => {
    try {
      // Всегда пытаемся загрузить с сервера
      const [sellersData, customersData] = await Promise.all([
        fetchFromServer('/sellers'),
        fetchFromServer('/customers')
      ]);

      // Создаем индексы из серверных данных
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
      console.error('Failed to fetch indexes from server:', error);
      
      // Fallback на локальные данные ТОЛЬКО если сервер недоступен
      console.warn('Falling back to local data for indexes');
      
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

  // Функция фильтрации записей на клиенте (для fallback-режима)
  const filterRecordsLocally = (records, query) => {
    if (!records || !Array.isArray(records)) return [];
    
    return records.filter((record) => {
      // Поиск по всем полям
      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        const sellerName = sellers && sellers[record.seller_id] ? sellers[record.seller_id].toLowerCase() : "";
        const customerName = customers && customers[record.customer_id] ? customers[record.customer_id].toLowerCase() : "";

        const matchesSearch =
          (record.date && record.date.includes(searchTerm)) ||
          sellerName.includes(searchTerm) ||
          customerName.includes(searchTerm) ||
          (record.total_amount && record.total_amount.toString().includes(searchTerm));

        if (!matchesSearch) return false;
      }

      // Фильтр по дате
      if (
        query["filter[date]"] &&
        record.date &&
        !record.date.includes(query["filter[date]"])
      ) {
        return false;
      }

      // Фильтр по покупателю
      if (query["filter[customer]"]) {
        const customerName = customers && customers[record.customer_id] ? customers[record.customer_id] : "";
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
        const sellerName = sellers && sellers[record.seller_id] ? sellers[record.seller_id] : "";
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
  const sortRecordsLocally = (records, sortParam) => {
    if (!sortParam || !records) return records;

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

  // функция получения записей с сервера
  const getRecords = async (query) => {
    const qs = new URLSearchParams(query);
    const nextQuery = qs.toString();
    
    // Проверяем кеш
    const cacheKey = JSON.stringify(query);
    if (queryCache.has(cacheKey)) {
      console.log('Returning cached result');
      return queryCache.get(cacheKey);
    }

    try {
      // Получаем данные с сервера
      const response = await fetchFromServer('/purchases', query);
      
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
      
      // Очищаем старые записи кеша
      if (queryCache.size > 50) {
        const firstKey = queryCache.keys().next().value;
        queryCache.delete(firstKey);
      }

      console.log('Data loaded from server:', lastResult.items.length, 'items');
      return lastResult;
    } catch (error) {
      console.error('Failed to fetch records from server:', error);
      
      // Fallback на локальные данные ТОЛЬКО если сервер недоступен
      console.warn('Falling back to local data filtering');
      
      // Получаем индексы, если их еще нет
      if (!sellers || !customers) {
        await getIndexes();
      }

      // Используем локальные данные для fallback
      const records = sourceData.purchase_records || [];
      
      // Фильтруем записи локально
      let filteredRecords = filterRecordsLocally(records, query);

      // Сортируем записи
      if (query.sort) {
        filteredRecords = sortRecordsLocally(filteredRecords, query.sort);
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

      console.log('Fallback data loaded:', lastResult.items.length, 'items');
      return lastResult;
    }
  };

  return {
    getIndexes,
    getRecords,
  };
}