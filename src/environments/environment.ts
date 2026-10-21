export const environment = {
  production: false,
  authTokenKey: 'retail-web',
  api: {
    // Effective API base. Relative URL uses the Angular dev proxy.
    baseUrl: '/booking-schedule',
    hostSso: 'http://localhost:8080',
    hostRcm: 'http://localhost:8080',
  },
  hostAllow: ['http://localhost:8080'],
  version: 'v 1.0.0',
};
