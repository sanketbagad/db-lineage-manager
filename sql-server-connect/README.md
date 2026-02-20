# SQL Server Connection Tools

Scripts to connect to and explore the SQL Server database.

## Setup

```bash
cd sql-server-connect
npm install
```

## Scripts

### Test Connection
```bash
npm test
```
Tests connection to the SQL Server and displays version info.

### List Tables
```bash
npm run tables
```
Lists all tables with row counts and sizes.

### Export Schema
```bash
npm run schema
```
Exports full database schema to:
- `schema-export.json` - JSON format with all tables/columns
- `schema-export.sql` - SQL DDL statements

## Configuration

Edit `config.js` to change connection settings:
- `server` - SQL Server IP/hostname
- `database` - Database name
- `user` / `password` - Credentials

## Troubleshooting

If connection fails:

1. **ESOCKET error** - Server not reachable
   - Check if you're on the same network or VPN
   - Verify the IP address is correct
   - Check if port 1433 is open

2. **ELOGIN error** - Authentication failed
   - Verify username/password
   - Check if SQL Server authentication is enabled

3. **Timeout** - Increase `connectTimeout` in config.js

## Alternative Tools

If you prefer GUI tools:

| Tool | Platform | Notes |
|------|----------|-------|
| [Azure Data Studio](https://azure.microsoft.com/products/data-studio) | Windows/Mac/Linux | Free, modern UI |
| [SQL Server Management Studio](https://aka.ms/ssmsfullsetup) | Windows only | Full-featured, official MS tool |
| [DBeaver](https://dbeaver.io/) | Windows/Mac/Linux | Free, supports many databases |
| [TablePlus](https://tableplus.com/) | Windows/Mac | Free tier available |
| [HeidiSQL](https://www.heidisql.com/) | Windows | Free, lightweight |
