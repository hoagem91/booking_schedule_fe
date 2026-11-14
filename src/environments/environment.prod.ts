export const environment = {
  production: true,
  authTokenKey: 'retail-web',
  api: {
    // Same-origin reverse proxy. Set an absolute URL only for this system's BE.
    baseUrl: '/booking-schedule',
    hostSso: 'https://booking-schedule-be.onrender.com',
    hostRcm: 'https://booking-schedule-be.onrender.com',
    AppID: 'Mr2n4FaCO8XdS7K6x4sHbIT6L+Gumltq7dy/EW0eIXQ=',
  },
  hostAllow: ['https://booking-schedule-be.onrender.com'],
  version: 'v 1.0.0',
};
