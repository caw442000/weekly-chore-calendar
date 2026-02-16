# Weekly Chore Calendar

A React + TypeScript app for managing weekly household chores with a Node.js/Express backend. You can add people and assign chores per person for specific days, across a simple weekly grid.

## Features

- **Family Management**: Create families with admin accounts
- **People Management**: Add family members with contact info
- **Chore Management**: Create and manage custom chores
- **Weekly Assignments**: Assign chores to people for specific days
- **User Views**: Admins can manage everything, users can view their assigned chores
- **Persistent Storage**: SQLite database backend

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite with React SWC plugin

### Backend
- Node.js + Express
- SQLite database
- JWT authentication
- bcrypt for password hashing

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd weekly-chore-calendar
```

2. Install all dependencies:
```bash
npm run install:all
```

This installs dependencies for both frontend and backend.

### Development

1. Start the backend server:
```bash
npm run backend:dev
```

The backend will run on `http://localhost:3001`

2. Start the frontend dev server (in a new terminal):
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### Environment Setup

**Backend** - Create `backend/.env`:
```env
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
```

**Frontend** - Create `.env.local`:
```env
VITE_API_URL=http://localhost:3001/api
```

## Usage

1. **Create a Family**: Use the "Create Family" tab to set up a new family with an admin account
2. **Login as Admin**: Use the "Admin Login" tab to manage your family
3. **Add People**: Go to the People tab and add family members
4. **Add Chores**: Go to the Chores tab and add custom chores
5. **Assign Chores**: Use the weekly grid to assign chores to people for specific days
6. **User Login**: Family members can use the "User Login" tab to view their assigned chores

## Project Structure

```
weekly-chore-calendar/
├── backend/              # Node.js/Express backend
│   ├── db/              # Database files
│   ├── middleware/      # Auth middleware
│   ├── routes/         # API routes
│   └── server.js       # Entry point
├── src/                # React frontend
│   ├── api/           # API client
│   ├── App.tsx        # Main component
│   └── styles.css     # Styles
└── package.json        # Frontend dependencies
```

## API Endpoints

- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/user/login` - User login
- `GET /api/families/:id` - Get family data
- `POST /api/families` - Create family
- `GET /api/people/family/:id` - Get people
- `POST /api/people/family/:id` - Add person
- `PUT /api/people/:id` - Update person
- `DELETE /api/people/:id` - Delete person
- `GET /api/chores/family/:id` - Get chores
- `POST /api/chores/family/:id` - Add chore
- `PUT /api/chores/:id` - Update chore
- `DELETE /api/chores/:id` - Delete chore
- `GET /api/assignments/family/:id/week/:weekStartISO` - Get assignments
- `POST /api/assignments/family/:id` - Add assignment
- `DELETE /api/assignments/:id` - Delete assignment

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

Quick summary:
1. Deploy backend to Railway/Render/Fly.io
2. Deploy frontend to Vercel/Netlify
3. Set `VITE_API_URL` environment variable in frontend deployment

## License

MIT
