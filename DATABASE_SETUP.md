# Database Configuration Guide

This guide explains how to configure the database connection for NAP Management application.

## Configuration Methods (Priority Order)

The application uses a priority-based configuration system:

1. **Environment Variable** (Highest Priority)
2. **Configuration File** (Middle Priority)
3. **Default Configuration** (Lowest Priority)

## Method 1: Environment Variable (Recommended for Servers)

Set the `DATABASE_URL` environment variable at the system level:

### Windows

```powershell
# PowerShell (as Administrator)
[System.Environment]::SetEnvironmentVariable("DATABASE_URL", "sqlserver://server:port;database=NAP_Management;user=username;password=password;encrypt=true", "Machine")

# Command Prompt (as Administrator)
setx DATABASE_URL "sqlserver://server:port;database=NAP_Management;user=username;password=password;encrypt=true" /M
```

### macOS/Linux

```bash
# Add to ~/.bashrc, ~/.zshrc, or system-wide environment
export DATABASE_URL="sqlserver://server:port;database=NAP_Management;user=username;password=password;encrypt=true"
```

## Method 2: Configuration File (Recommended for Desktop Users)

Use the built-in Database Configuration UI:

1. Open NAP Management application
2. Click the "Cài Đặt DB" (Database Settings) button in the navigation menu
3. Fill in your database connection details:
   - **Server**: Your SQL Server hostname/IP (e.g., `localhost`, `192.168.1.100`)
   - **Port**: SQL Server port (default: `1433`)
   - **Database**: Database name (e.g., `NAP_Management`)
   - **Username**: SQL Server username (e.g., `SA`)
   - **Password**: SQL Server password
   - **Encrypt**: Enable/disable connection encryption
   - **Trust Server Certificate**: For self-signed certificates
4. Click "Test Connection" to verify settings
5. Click "Save & Restart" to apply configuration

The configuration will be saved to: `[User Data Directory]/database-config.json`

### User Data Directory Locations:

- **Windows**: `%APPDATA%/NAP Management/database-config.json`
- **macOS**: `~/Library/Application Support/NAP Management/database-config.json`
- **Linux**: `~/.config/NAP Management/database-config.json`

## Method 3: Default Configuration

If no environment variable or config file is found, the application uses default settings:

- **Server**: `localhost`
- **Port**: `1433`
- **Database**: `NAP_Management` (Windows) or `MyDatabase` (others)
- **Username**: `SA`
- **Password**: `MyStrongPass123`
- **Encryption**: Disabled for compatibility

## Connection String Format

The application builds connection strings in this format:

```
sqlserver://server:port;database=dbname;user=username;password=password;encrypt=true/DANGER_PLAINTEXT;trustServerCertificate=true
```

## SQL Server Setup

### For Development (SQL Server Express)

1. **Install SQL Server Express**:

   - Download from Microsoft's website
   - Enable SQL Server Authentication mode
   - Set SA password during installation

2. **Enable TCP/IP Protocol**:

   - Open SQL Server Configuration Manager
   - Enable TCP/IP protocol for SQL Server Express
   - Set port to 1433 or note the dynamic port
   - Restart SQL Server service

3. **Configure Firewall**:
   - Allow SQL Server through Windows Firewall
   - Open port 1433 (or your custom port)

### For Production

1. **Use Windows Authentication** (recommended):

   ```
   sqlserver://server:port;database=NAP_Management;integratedSecurity=true;encrypt=true
   ```

2. **Enable SSL/TLS encryption**:

   - Install valid SSL certificate on SQL Server
   - Set `encrypt=true` in connection settings

3. **Use strong passwords** and follow security best practices

## Troubleshooting

### Common Issues

1. **"Login failed for user"**:

   - Verify username and password
   - Check if SQL Server Authentication is enabled
   - Ensure user has access to the database

2. **"Server not found or not accessible"**:

   - Check server name/IP address
   - Verify SQL Server is running
   - Check firewall settings
   - Confirm TCP/IP protocol is enabled

3. **"Certificate errors"**:

   - Set `trustServerCertificate=true` for self-signed certificates
   - Or install proper SSL certificate on SQL Server

4. **"Database not found"**:
   - Create the database manually
   - Run Prisma migrations: `npx prisma migrate deploy`

### Testing Connection

Use the built-in connection tester in the Database Configuration modal, or test manually:

```bash
# Using sqlcmd (if installed)
sqlcmd -S server,port -U username -P password -d database -Q "SELECT 1"
```

## Security Notes

- **Never commit passwords** to version control
- Use **environment variables** for production deployments
- Enable **encryption** for production databases
- Use **Windows Authentication** when possible
- Regularly **rotate passwords**
- **Limit database permissions** to minimum required

## Migration and Updates

When updating the application:

1. **Backup your database** before updates
2. **Config files are preserved** during app updates
3. **Environment variables persist** across updates
4. Check release notes for any database schema changes

For database schema updates, the application will automatically run migrations on startup.
