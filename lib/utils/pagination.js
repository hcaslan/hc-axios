/**
 * Automatic pagination utility
 */
export class PaginationHelper {
  constructor(instance, {
    pageParam = 'page',
    limitParam = 'limit',
    defaultLimit = 20,
    totalKey = 'total',
    dataKey = 'data',
    pageKey = 'page'
  } = {}) {
    this.instance = instance;
    this.pageParam = pageParam;
    this.limitParam = limitParam;
    this.defaultLimit = defaultLimit;
    this.totalKey = totalKey;
    this.dataKey = dataKey;
    this.pageKey = pageKey;
  }

  async fetchAll(url, options = {}) {
    const allData = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const params = {
        [this.pageParam]: currentPage,
        [this.limitParam]: this.defaultLimit,
        ...options.params
      };

      const response = await this.instance.get(url, { ...options, params });
      const data = response.data[this.dataKey] || response.data;
      const total = response.data[this.totalKey];
      const page = response.data[this.pageKey] || currentPage;

      allData.push(...data);

      // Check if there's more data
      if (total && allData.length >= total) {
        hasMore = false;
      } else if (data.length < this.defaultLimit) {
        hasMore = false;
      } else {
        currentPage++;
      }
    }

    return allData;
  }

  async *fetchPages(url, options = {}) {
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const params = {
        [this.pageParam]: currentPage,
        [this.limitParam]: this.defaultLimit,
        ...options.params
      };

      const response = await this.instance.get(url, { ...options, params });
      const data = response.data[this.dataKey] || response.data;
      const total = response.data[this.totalKey];

      yield {
        data,
        page: currentPage,
        total,
        hasMore: total ? (currentPage * this.defaultLimit) < total : data.length === this.defaultLimit
      };

      if (total && (currentPage * this.defaultLimit) >= total) {
        hasMore = false;
      } else if (data.length < this.defaultLimit) {
        hasMore = false;
      } else {
        currentPage++;
      }
    }
  }
}