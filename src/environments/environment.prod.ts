export const environment = {
  production: true,
  authTokenKey: 'retail-web',
  api: {
    // Same-origin reverse proxy. Set an absolute URL only for this system's BE.
    baseUrl: '/booking-schedule',
    hostSso: 'https://api.kafa.com.vn',
    hostRcm: 'https://api.kafa.com.vn',
    AppID: 'Mr2n4FaCO8XdS7K6x4sHbIT6L+Gumltq7dy/EW0eIXQ=',
  },
  hostAllow: ['https://api.kafa.com.vn'],
  version: 'v 1.0.0',
};
