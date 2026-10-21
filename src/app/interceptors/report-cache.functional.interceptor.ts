import {
  HttpHandlerFn,
  HttpResponse,
  HttpRequest
} from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

interface CacheEntry {
  response: HttpResponse<any>;
  timestamp: number;
}

class ReportCacheService {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, any>();
  private readonly CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  getCachedResponse(cacheKey: string): HttpResponse<any> | null {
    const entry = this.cache.get(cacheKey);
    if (entry && !this.isCacheExpired(entry)) {
      return entry.response;
    }
    if (entry) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

  setCachedResponse(cacheKey: string, response: HttpResponse<any>): void {
    this.cache.set(cacheKey, {
      response: response.clone(),
      timestamp: Date.now()
    });
  }

  getPendingRequest(cacheKey: string): any {
    return this.pendingRequests.get(cacheKey);
  }

  setPendingRequest(cacheKey: string, request$: any): void {
    this.pendingRequests.set(cacheKey, request$);
  }

  removePendingRequest(cacheKey: string): void {
    this.pendingRequests.delete(cacheKey);
  }

  private isCacheExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.CACHE_TIMEOUT;
  }

  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

let cacheService: ReportCacheService | null = null;

function getCacheService(): ReportCacheService {
  if (!cacheService) {
    cacheService = new ReportCacheService();
  }
  return cacheService;
}

function isReportEndpoint(url: string): boolean {
  const reportEndpoints = [
    'report/product',
    'report/company-summary',
    'report/revenue',
    'report/detail-product-branch'
  ];
  return reportEndpoints.some(endpoint => url.includes(endpoint));
}

function getCacheKey(request: HttpRequest<any>): string {
  const body = request.method === 'POST' ? JSON.stringify(request.body) : '';
  return `${request.method}:${request.url}:${body}`;
}

export function reportCacheInterceptor(
  req: HttpRequest<any>,
  next: HttpHandlerFn
): any {
  // Only cache GET requests and specific report endpoints
  if (req.method !== 'GET' && !isReportEndpoint(req.url)) {
    return next(req);
  }

  const cacheService = getCacheService();
  const cacheKey = getCacheKey(req);

  // Check if we have a valid cached response
  const cachedResponse = cacheService.getCachedResponse(cacheKey);
  if (cachedResponse) {
    return of(cachedResponse.clone());
  }

  // Check if a request is already in flight
  const pendingRequest = cacheService.getPendingRequest(cacheKey);
  if (pendingRequest) {
    return pendingRequest;
  }

  // Make the request and cache the response
  const request$ = next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        cacheService.setCachedResponse(cacheKey, event);
        cacheService.removePendingRequest(cacheKey);
      }
    }),
    shareReplay(1)
  );

  cacheService.setPendingRequest(cacheKey, request$);
  return request$;
}
