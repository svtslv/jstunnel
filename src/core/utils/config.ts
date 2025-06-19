export const isDev = process.env.NODE_ENV === 'development';
export const eventSourceUrl = isDev ? 'http://localhost:9002/api/events' : '/api/events';
