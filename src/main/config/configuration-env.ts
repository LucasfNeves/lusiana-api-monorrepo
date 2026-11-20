export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3003', 10),
    env: process.env.NODE_ENV,
  },
  database: {
    url: process.env.DATABASE_URL,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    dbName: process.env.POSTGRES_DB,
    port: parseInt(process.env.POSTGRES_PORT ?? '5435', 10),
  },
  http: {
    corsOrigin: process.env.CORS_ORIGIN,
  },
});
