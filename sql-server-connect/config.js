// SQL Server connection configuration
export const config = {
  server: '10.40.10.124',
  database: 'GXMAPS_GXDASH_CLAIMS',
  user: 'GxDash',
  password: 'Galaxy@123',
  options: {
    encrypt: true,
    trustServerCertificate: true, // Required for self-signed certs
    enableArithAbort: true,
    connectTimeout: 30000, // 30 seconds
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}
