export const environment = {
  production: true,
  authTokenKey: 'retail-web',
  api: {
    // Same-origin reverse proxy; legacy hosts below are not API routing config.
    baseUrl: '/booking-schedule',
    hostSso: 'https://api.smarthkd.vn',
    hostRcm: 'https://api.smarthkd.vn',
    AppID: 'Mr2n4FaCO8XdS7K6x4sHbIT6L+Gumltq7dy/EW0eIXQ=',
  },
  hostAllow: ['https://api.smarthkd.vn'],
  version: 'v 1.0.0',
};
