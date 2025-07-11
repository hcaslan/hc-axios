import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { PaginationHelper } from "../../../lib/utils/pagination.js";

describe("PaginationHelper", () => {
  let mockInstance;
  let paginationHelper;

  beforeEach(() => {
    mockInstance = {
      get: jest.fn(),
    };
    paginationHelper = new PaginationHelper(mockInstance);
  });

  describe("constructor", () => {
    test("should initialize with default options", () => {
      expect(paginationHelper.instance).toBe(mockInstance);
      expect(paginationHelper.pageParam).toBe("page");
      expect(paginationHelper.limitParam).toBe("limit");
      expect(paginationHelper.defaultLimit).toBe(20);
      expect(paginationHelper.totalKey).toBe("total");
      expect(paginationHelper.dataKey).toBe("data");
      expect(paginationHelper.pageKey).toBe("page");
    });

    test("should initialize with custom options", () => {
      const customHelper = new PaginationHelper(mockInstance, {
        pageParam: "pageNumber",
        limitParam: "pageSize",
        defaultLimit: 50,
        totalKey: "totalCount",
        dataKey: "results",
        pageKey: "currentPage",
      });

      expect(customHelper.pageParam).toBe("pageNumber");
      expect(customHelper.limitParam).toBe("pageSize");
      expect(customHelper.defaultLimit).toBe(50);
      expect(customHelper.totalKey).toBe("totalCount");
      expect(customHelper.dataKey).toBe("results");
      expect(customHelper.pageKey).toBe("currentPage");
    });
  });

  describe("fetchAll", () => {
    test("should fetch all pages when total is provided", async () => {
      const page1Data = Array(20).fill(null).map((_, i) => ({ id: i + 1 }));
      const page2Data = Array(20).fill(null).map((_, i) => ({ id: i + 21 }));
      const page3Data = Array(5).fill(null).map((_, i) => ({ id: i + 41 }));

      mockInstance.get
        .mockResolvedValueOnce({ data: { data: page1Data, total: 45 } })
        .mockResolvedValueOnce({ data: { data: page2Data, total: 45 } })
        .mockResolvedValueOnce({ data: { data: page3Data, total: 45 } });

      const result = await paginationHelper.fetchAll("/api/items");

      expect(result).toHaveLength(45);
      expect(result[0]).toEqual({ id: 1 });
      expect(result[44]).toEqual({ id: 45 });

      expect(mockInstance.get).toHaveBeenCalledTimes(3);
      expect(mockInstance.get).toHaveBeenNthCalledWith(1, "/api/items", {
        params: { page: 1, limit: 20 },
      });
      expect(mockInstance.get).toHaveBeenNthCalledWith(2, "/api/items", {
        params: { page: 2, limit: 20 },
      });
      expect(mockInstance.get).toHaveBeenNthCalledWith(3, "/api/items", {
        params: { page: 3, limit: 20 },
      });
    });

    test("should stop when data length is less than defaultLimit even with more data", async () => {
      mockInstance.get
        .mockResolvedValueOnce({
          data: { data: Array(20).fill({ id: 1 }), total: 30 },
        })
        .mockResolvedValueOnce({
          data: { data: Array(10).fill({ id: 2 }), total: 30 },
        });

      const result = await paginationHelper.fetchAll("/api/items");

      expect(result).toHaveLength(30);
      expect(mockInstance.get).toHaveBeenCalledTimes(2);
    });

    test("should stop fetching when receiving empty data", async () => {
      mockInstance.get.mockResolvedValueOnce({
        data: { data: [], total: 100 }, // Empty data stops pagination
      });

      const result = await paginationHelper.fetchAll("/api/items");

      expect(result).toEqual([]);
      expect(mockInstance.get).toHaveBeenCalledTimes(1);
    });

    test("should stop fetching when receiving empty data", async () => {
      mockInstance.get.mockResolvedValueOnce({
        data: { data: [], total: 0 },
      });

      await paginationHelper.fetchAll("/api/items", {
        params: { status: "active", sort: "name" },
      });

      expect(mockInstance.get).toHaveBeenCalledWith("/api/items", {
        params: { page: 1, limit: 20, status: "active", sort: "name" },
      });
    });

    test("should handle response without data wrapper", async () => {
      mockInstance.get.mockResolvedValueOnce({
        data: [{ id: 1 }, { id: 2 }],
      });

      const result = await paginationHelper.fetchAll("/api/items");

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test("should pass through other options to get method", async () => {
      mockInstance.get.mockResolvedValueOnce({
        data: { data: [], total: 0 },
      });

      await paginationHelper.fetchAll("/api/items", {
        headers: { Authorization: "Bearer token" },
        timeout: 5000,
      });

      expect(mockInstance.get).toHaveBeenCalledWith("/api/items", {
        headers: { Authorization: "Bearer token" },
        timeout: 5000,
        params: { page: 1, limit: 20 },
      });
    });

    test("should handle custom pagination structure", async () => {
      const customHelper = new PaginationHelper(mockInstance, {
        pageParam: "offset",
        limitParam: "count",
        defaultLimit: 10,
        dataKey: "items",
        totalKey: "totalItems",
      });

      mockInstance.get.mockResolvedValueOnce({
        data: {
          items: [{ id: 1 }],
          totalItems: 1,
        },
      });

      const result = await customHelper.fetchAll("/api/items");

      expect(result).toEqual([{ id: 1 }]);
      expect(mockInstance.get).toHaveBeenCalledWith("/api/items", {
        params: { offset: 1, count: 10 },
      });
    });

    test("should handle network errors", async () => {
      mockInstance.get.mockRejectedValueOnce(new Error("Network error"));

      await expect(paginationHelper.fetchAll("/api/items")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("fetchPages", () => {
    test("should yield pages as async generator", async () => {
      const page1Data = Array(20).fill(null).map((_, i) => ({ id: i + 1 }));
      const page2Data = Array(20).fill(null).map((_, i) => ({ id: i + 21 }));
      const page3Data = Array(5).fill(null).map((_, i) => ({ id: i + 41 }));

      mockInstance.get
        .mockResolvedValueOnce({ data: { data: page1Data, total: 45 } })
        .mockResolvedValueOnce({ data: { data: page2Data, total: 45 } })
        .mockResolvedValueOnce({ data: { data: page3Data, total: 45 } });

      const pages = [];
      for await (const page of paginationHelper.fetchPages("/api/items")) {
        pages.push(page);
      }

      expect(pages).toHaveLength(3);
      expect(pages[0]).toEqual({
        data: page1Data,
        page: 1,
        total: 45,
        hasMore: true,
      });
      expect(pages[1]).toEqual({
        data: page2Data,
        page: 2,
        total: 45,
        hasMore: true,
      });
      expect(pages[2]).toEqual({
        data: page3Data,
        page: 3,
        total: 45,
        hasMore: false,
      });
    });

    test("should determine hasMore without total", async () => {
      mockInstance.get
        .mockResolvedValueOnce({
          data: { data: Array(20).fill({ id: 1 }) },
        })
        .mockResolvedValueOnce({
          data: { data: Array(15).fill({ id: 2 }) },
        });

      const pages = [];
      for await (const page of paginationHelper.fetchPages("/api/items")) {
        pages.push(page);
      }

      expect(pages[0].hasMore).toBe(true);
      expect(pages[1].hasMore).toBe(false);
    });

    test("should pass options to get method", async () => {
      mockInstance.get.mockResolvedValueOnce({
        data: { data: [], total: 0 },
      });

      const generator = paginationHelper.fetchPages("/api/items", {
        headers: { "X-API-Key": "test" },
        params: { filter: "active" },
      });

      await generator.next();

      expect(mockInstance.get).toHaveBeenCalledWith("/api/items", {
        headers: { "X-API-Key": "test" },
        params: { page: 1, limit: 20, filter: "active" },
      });
    });

    test("should handle errors during iteration", async () => {
      // First page returns full data to ensure continuation
      mockInstance.get
        .mockResolvedValueOnce({
          data: { data: Array(20).fill({ id: 1 }), total: 40 },
        })
        .mockRejectedValueOnce(new Error("Server error"));

      const pages = [];
      const generator = paginationHelper.fetchPages("/api/items");

      // First iteration should succeed
      const firstPage = await generator.next();
      expect(firstPage.value.data).toHaveLength(20);

      // Second iteration should throw
      await expect(generator.next()).rejects.toThrow("Server error");
    });

    test("should use internal page counter, not response page value", async () => {
      const customHelper = new PaginationHelper(mockInstance, {
        pageKey: "currentPage",
      });

      mockInstance.get.mockResolvedValueOnce({
        data: {
          data: [{ id: 1 }],
          currentPage: 5,
          total: 10,
        },
      });

      const generator = customHelper.fetchPages("/api/items");
      const { value } = await generator.next();

      expect(value.page).toBe(1);
    });

    test("should yield empty data array when no data", async () => {
      mockInstance.get.mockResolvedValueOnce({
        data: { data: [] },
      });

      const generator = paginationHelper.fetchPages("/api/items");
      const { value } = await generator.next();

      expect(value.data).toEqual([]);
      expect(value.hasMore).toBe(false);
    });

    test("should handle response without data wrapper in generator", async () => {
      mockInstance.get.mockResolvedValueOnce({
        data: [{ id: 1 }, { id: 2 }],
      });

      const generator = paginationHelper.fetchPages("/api/items");
      const { value } = await generator.next();

      expect(value.data).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test("should calculate correct hasMore with exact page boundaries", async () => {
      const customHelper = new PaginationHelper(mockInstance, {
        defaultLimit: 5,
      });

      mockInstance.get
        .mockResolvedValueOnce({
          data: { data: Array(5).fill({ id: 1 }), total: 10 },
        })
        .mockResolvedValueOnce({
          data: { data: Array(5).fill({ id: 2 }), total: 10 },
        });

      const pages = [];
      for await (const page of customHelper.fetchPages("/api/items")) {
        pages.push(page);
      }

      expect(pages[0].hasMore).toBe(true);
      expect(pages[1].hasMore).toBe(false);
    });
  });
});