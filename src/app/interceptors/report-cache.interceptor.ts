import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

interface CacheEntry {
  response: HttpResponse<any>;
  timestamp: number;
}

@Injectable()
export class ReportCacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Observable<HttpEvent<any>>>();
  // Cache timeout in milliseconds (5 minutes)
  private readonly CACHE_TIMEOUT = 5 * 60 * 1000;

  constructor() { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only cache GET requests and specific report endpoints
    if (request.method !== 'GET' && !this.isReportPostEndpoint(request)) {
      return next.handle(request);
    }

    const cacheKey = this.getCacheKey(request);

    // Check if we have a valid cached response
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && !this.isCacheExpired(cachedEntry)) {
      return of(cachedEntry.response.clone());
    }

    // Check if a request is already in flight
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Make the request and cache the response
    const request$ = next.handle(request).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.cache.set(cacheKey, {
            response: event.clone(),
            timestamp: Date.now()
          });
          this.pendingRequests.delete(cacheKey);
        }
      }),
      shareReplay(1)
    );

    this.pendingRequests.set(cacheKey, request$);
    return request$;
  }

  private isReportPostEndpoint(request: HttpRequest<unknown>): boolean {
    const reportEndpoints = [
      'report/product',
      'report/company-summary',
      'report/revenue',
      'report/detail-product-branch'
    ];
    return request.method === 'POST' && 
           reportEndpoints.some(endpoint => request.url.includes(endpoint));
  }

  private getCacheKey(request: HttpRequest<unknown>): string {
    const body = request.method === 'POST' ? JSON.stringify(request.body) : '';
    return `${request.method}:${request.url}:${body}`;
  }

  private isCacheExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.CACHE_TIMEOUT;
  }

  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  clearCacheByKey(key: string): void {
    this.cache.delete(key);
  }
}
