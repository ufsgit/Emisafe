import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../tokens/api-url.token';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(API_BASE_URL);

  let fullUrl = req.url;
  // If the request is a relative API path like '/api/...' or 'api/...', prepend baseUrl
  if (req.url.startsWith('/api')) {
    fullUrl = `${baseUrl}${req.url.substring(4)}`;
  } else if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) {
    fullUrl = `${baseUrl.replace(/\/$/, '')}/${req.url.replace(/^\//, '')}`;
  }

  // Clone request with absolute URL and credentials for HttpOnly cookie session support
  const authReq = req.clone({
    url: fullUrl,
    withCredentials: true
  });

  return next(authReq);
};

