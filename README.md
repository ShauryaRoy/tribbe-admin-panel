# Movo Admin Panel - Microservice

A standalone admin panel microservice for managing the Movo event platform.

## Features

- **Event Management**: Approve/reject event requests for the discover page
- **Dashboard**: Overview statistics for events, groups, and users
- **User Management**: Ban/unban users, promote/demote admins (coming soon)
- **Group Management**: View and manage groups (coming soon)
- **Audit Logs**: Track all admin actions (coming soon)
- **Analytics**: View events and groups trends over time (coming soon)

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + Wouter
- **Database**: PostgreSQL (shared with main app)
- **Authentication**: JWT

## Setup Instructions

### 1. Database Migration

First, run the discover workflow migration on your main database:

```bash
psql -U your_user -d your_database -f ../migrations/0001_add_discover_workflow.sql
```

### 2. Environment Configuration

Update the `.env` file with your database credentials:

```env
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/movo
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
```

### 3. Create Admin User

You need to manually create an admin user in the database:

```sql
INSERT INTO users (username, email, password, role)
VALUES ('admin', 'admin@example.com', '$2a$10$...', 'superadmin');
```

Note: Hash the password using bcrypt before inserting. You can use this Node.js script:

```javascript
const bcrypt = require("bcryptjs");
const password = "your-password";
bcrypt.hash(password, 10).then((hash) => console.log(hash));
```

### 4. Start the Services

Start both the backend API and frontend dev server:

```bash
npm run dev
```

This runs:

- Backend server on `http://localhost:3002`
- Frontend dev server on `http://localhost:3001`

Or run them separately:

```bash
# Backend only
npm run server:dev

# Frontend only
npm run client:dev
```

### 5. Access the Admin Panel

Open your browser and navigate to:

```
http://localhost:3001
```

Login with your admin credentials.

## API Endpoints

### Authentication

- `POST /api/admin/login` - Admin login

### Dashboard

- `GET /api/admin/dashboard/stats` - Get dashboard statistics

### Events

- `GET /api/admin/events?filter={all|requested|approved|rejected}` - List events
- `POST /api/admin/events/:id/approve-discover` - Approve event for discover
- `POST /api/admin/events/:id/reject-discover` - Reject event with reason
- `DELETE /api/admin/events/:id` - Delete an event

### Groups

- `GET /api/admin/groups` - List all groups
- `DELETE /api/admin/groups/:id` - Delete a group

### Users

- `GET /api/admin/users` - List all users
- `POST /api/admin/users/:id/ban` - Ban a user
- `POST /api/admin/users/:id/unban` - Unban a user
- `POST /api/admin/users/:id/promote` - Promote to admin (superadmin only)
- `POST /api/admin/users/:id/demote` - Demote from admin (superadmin only)

### Analytics

- `GET /api/admin/analytics/events?days=30` - Events analytics
- `GET /api/admin/analytics/groups?days=30` - Groups analytics

### Audit Logs

- `GET /api/admin/audit-logs` - View audit log (superadmin only)

## Workflow

### Event Discover Request Flow

1. **Host requests discover listing** (from main app):

   ```
   POST /api/events/:id/request-discover
   ```

2. **Admin reviews request** in admin panel:

   - View pending requests in Events page
   - Approve or reject with reason

3. **Approved events appear** in discover page:
   ```
   GET /api/events/discover
   ```

## Production Deployment

### Build for Production

```bash
npm run build
```

This creates:

- `dist/server/` - Compiled backend code
- `dist/client/` - Built frontend assets

### Start Production Server

```bash
npm start
```

### Environment Variables

Make sure to set these in production:

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=your-production-database-url
JWT_SECRET=your-very-secure-random-secret
```

## Security Notes

- Change the `JWT_SECRET` to a strong random value
- Use HTTPS in production
- Set appropriate CORS origins
- Regularly review audit logs
- Limit superadmin access

## Folder Structure

```
adminpanel/
├── server/              # Backend API
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth and error handling
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── types/           # TypeScript types
├── client/              # Frontend React app
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── App.tsx      # Main app component
│   │   ├── Login.tsx    # Login page
│   │   ├── Navbar.tsx   # Navigation
│   │   └── api.ts       # API client
│   └── index.html
├── migrations/          # Database migrations
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env
```

## Troubleshooting

### Cannot connect to database

- Check your `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists and is accessible

### Login fails

- Check if admin user exists in database
- Verify password is correctly hashed
- Check `JWT_SECRET` is set

### Frontend can't reach backend

- Ensure backend is running on port 3002
- Check Vite proxy configuration in `vite.config.ts`
- Verify CORS settings in `server/index.ts`

## Future Enhancements

- [ ] Complete Groups management UI
- [ ] Complete Users management UI
- [ ] Complete Audit Logs UI
- [ ] Add analytics charts
- [ ] Email notifications for rejections
- [ ] Bulk actions
- [ ] Advanced filtering and search
- [ ] Export data functionality
