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
    if (!array || !Array.isArray(array)) return {};
    
    return array.reduce((acc, item) => {
      if (item && item[idField]) {
        acc[item[idField]] = formatter ? formatter(item) : item;
      }
      return acc;
    }, {});
  };

  // функция для приведения строк в тот вид, который нужен нашей таблице
  const mapRecords = (data) => {
    if (!data || !Array.isArray(data)) return [];
    
    return data.map((item) => ({
      id: item.receipt_id || item.id,
      date: item.date || '',
      seller: sellers && sellers[item.seller_id] ? sellers[item.seller_id] : item.seller_id || '',
      customer: customers && customers[item.customer_id] ? customers[item.customer_id] : item.customer_id || '',
      total: item.total_amount || item.total || 0,
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
      console.log(`Fetching from ${url.toString()}`);
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received data from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      throw error;
    }
  };

  // функция получения индексов с сервера
  const getIndexes = async () => {
    // Проверяем кеш
    if (sellers && customers) {
      console.log('Using cached indexes');
      return formatIndexes();
    }

    try {
      // Пытаемся загрузить с сервера
      console.log('Fetching indexes from server...');
      const [sellersData, customersData] = await Promise.all([
        fetchFromServer('/sellers').catch(err => {
          console.warn('Failed to fetch sellers, using local data');
          return null;
        }),
        fetchFromServer('/customers').catch(err => {
          console.warn('Failed to fetch customers, using local data');
          return null;
        })
      ]);

      // Если серверные данные получены, используем их
      if (sellersData && Array.isArray(sellersData) && sellersData.length > 0) {
        sellers = createIndex(
          sellersData,
          "id",
          (v) => `${v.first_name || ''} ${v.last_name || ''}`.trim() || v.name || v.id,
        );
      }

      if (customersData && Array.isArray(customersData) && customersData.length > 0) {
        customers = createIndex(
          customersData,
          "id",
          (v) => `${v.first_name || ''} ${v.last_name || ''}`.trim() || v.name || v.id,
        );
      }

      // Если серверные данные не получены, используем локальные
      if (!sellers || Object.keys(sellers).length === 0) {
        console.log('Using local sellers data');
        sellers = createIndex(
          sourceData.sellers || [],
          "id",
          (v) => `${v.first_name || ''} ${v.last_name || ''}`.trim(),
        );
      }

      if (!customers || Object.keys(customers).length === 0) {
        console.log('Using local customers data');
        customers = createIndex(
          sourceData.customers || [],
          "id",
          (v) => `${v.first_name || ''} ${v.last_name || ''}`.trim(),
        );
      }

      return formatIndexes();
    } catch (error) {
      console.error('Failed to fetch indexes:', error);
      
      // Fallback на локальные данные
      console.log('Falling back to local data for indexes');
      sellers = createIndex(
        sourceData.sellers || [],
        "id",
        (v) => `${v.first_name || ''} ${v.last_name || ''}`.trim(),
      );
      
      customers = createIndex(
        sourceData.customers || [],
        "id",
        (v) => `${v.first_name || ''} ${v.last_name || ''}`.trim(),
      );

      return formatIndexes();
    }
  };

  // Вспомогательная функция для форматирования индексов
  const formatIndexes = () => {
    const sellerOptions = {};
    const customerOptions = {};

    if (sellers) {
      Object.values(sellers).forEach((name) => {
        if (name && typeof name === 'string') {
          sellerOptions[name] = name;
        }
      });
    }

    if (customers) {
      Object.values(customers).forEach((name) => {
        if (name && typeof name === 'string') {
          customerOptions[name] = name;
        }
      });
    }

    return {
      sellers: sellerOptions,
      customers: customerOptions,
    };
  };

  // Функция фильтрации записей на клиенте (для fallback-режима)
  const filterRecordsLocally = (records, query) => {
    if (!records || !Array.isArray(records)) return [];
    
    return records.filter((record) => {
      if (!record) return false;
      
      // Поиск по всем полям
      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        const sellerName = sellers && sellers[record.seller_id] ? sellers[record.seller_id].toLowerCase() : '';
        const customerName = customers && customers[record.customer_id] ? customers[record.customer_id].toLowerCase() : '';

        const matchesSearch =
          (record.date && record.date.toLowerCase().includes(searchTerm)) ||
          sellerName.includes(searchTerm) ||
          customerName.includes(searchTerm) ||
          (record.total_amount && record.total_amount.toString().includes(searchTerm));

        if (!matchesSearch) return false;
      }

      // Фильтр по дате
      if (query["filter[date]"] && record.date) {
        if (!record.date.includes(query["filter[date]"])) {
          return false;
        }
      }

      // Фильтр по покупателю
      if (query["filter[customer]"]) {
        const customerName = customers && customers[record.customer_id] ? customers[record.customer_id] : '';
        if (!customerName.toLowerCase().includes(query["filter[customer]"].toLowerCase())) {
          return false;
        }
      }

      // Фильтр по продавцу
      if (query["filter[seller]"]) {
        const sellerName = sellers && sellers[record.seller_id] ? sellers[record.seller_id] : '';
        if (sellerName !== query["filter[seller]"]) {
          return false;
        }
      }

      // Фильтр по сумме (от)
      if (query["filter[totalFrom]"] && record.total_amount) {
        if (record.total_amount < Number(query["filter[totalFrom]"])) {
          return false;
        }
      }

      // Фильтр по сумме (до)
      if (query["filter[totalTo]"] && record.total_amount) {
        if (record.total_amount > Number(query["filter[totalTo]"])) {
          return false;
        }
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
        valueA = a.date ? new Date(a.date).getTime() : 0;
        valueB = b.date ? new Date(b.date).getTime() : 0;
      } else if (field === "total") {
        valueA = a.total_amount || 0;
        valueB = b.total_amount || 0;
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
      // Получаем индексы, если их еще нет
      if (!sellers || !customers || Object.keys(sellers).length === 0) {
        await getIndexes();
      }

      // Пытаемся получить данные с сервера
      console.log('Fetching records from server with query:', query);
      const response = await fetchFromServer('/purchases', query).catch(err => {
        console.warn('Failed to fetch from server, using local data');
        return null;
      });

      let total, items;

      if (response && response.items && Array.isArray(response.items)) {
        // Используем серверные данные
        total = response.total || response.items.length;
        items = response.items;
        console.log('Using server data:', items.length, 'items');
      } else {
        // Fallback на локальные данные
        console.log('Using local data');
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

        items = filteredRecords.slice(start, end);
        total = filteredRecords.length;
      }

      lastQuery = nextQuery;
      lastResult = {
        total: total || 0,
        items: mapRecords(items),
      };

      // Сохраняем в кеш
      queryCache.set(cacheKey, lastResult);
      
      // Очищаем старые записи кеша
      if (queryCache.size > 50) {
        const firstKey = queryCache.keys().next().value;
        queryCache.delete(firstKey);
      }

      return lastResult;
    } catch (error) {
      console.error('Failed to get records:', error);
      
      // Возвращаем пустой результат в случае ошибки
      return {
        total: 0,
        items: [],
      };
    }
  };

  return {
    getIndexes,
    getRecords,
  };
}