# Code Comments Guide

This document explains what the main files and scripts do.

## Package.json Scripts

The `package.json` file contains scripts that make it easy to run common tasks:

- **`npm run dev`**: Starts the frontend development server on http://localhost:5173
  - Hot reloads automatically when you change code
  - Shows errors in the browser

- **`npm run build`**: Creates a production build of the frontend
  - Compiles and optimizes all code
  - Outputs to the `dist` folder
  - Ready to deploy to a web server

- **`npm run preview`**: Tests the production build locally
  - Builds the app and serves it
  - Lets you see how it will look in production

- **`npm run backend:dev`**: Starts the backend development server
  - Runs on http://localhost:3001
  - Auto-restarts when you change code (using --watch)

- **`npm run backend:start`**: Starts the backend in production mode
  - For use after deployment
  - No auto-restart

- **`npm run install:all`**: Installs dependencies for both frontend and backend
  - Saves time - one command instead of two

## File Structure

### Frontend (`src/` folder)
- **`App.tsx`**: Main React component - contains all the UI logic
- **`api/client.ts`**: Handles all communication with the backend API
- **`styles.css`**: All the CSS styling for the app

### Backend (`backend/` folder)
- **`server.js`**: Main server file - sets up Express and routes
- **`db/database.js`**: Database setup and initialization
- **`routes/`**: API route handlers (auth, families, people, chores, assignments)
- **`middleware/auth.js`**: Authentication middleware - checks if users are logged in

## How Data Flows

1. **User Action**: User clicks a button or fills out a form
2. **Frontend Handler**: React handler function (like `handleAddPerson`) is called
3. **API Call**: Handler calls `apiClient.addPerson()` which sends HTTP request to backend
4. **Backend Route**: Express route receives request, validates it, checks authentication
5. **Database**: Route queries/updates the SQLite database
6. **Response**: Backend sends response back to frontend
7. **Update UI**: Frontend updates its state, React re-renders the UI

## Key Concepts

### State Management
- React uses `useState` to store data that can change
- When state changes, React automatically re-renders the component
- Example: `const [people, setPeople] = useState([])` stores a list of people

### useEffect Hook
- Runs code when something changes
- Used for loading data, setting up subscriptions, etc.
- Example: Load family data when `currentFamilyId` changes

### Async/Await
- Used for operations that take time (like API calls)
- `async` marks a function as asynchronous
- `await` waits for a promise to complete before continuing
- Example: `const data = await apiClient.getFamily(id)`

### Authentication Flow
1. User enters email/password
2. Frontend sends credentials to `/api/auth/admin/login`
3. Backend checks if credentials are correct
4. Backend creates a JWT token and sends it back
5. Frontend saves token in localStorage
6. Future requests include token in Authorization header
7. Backend middleware verifies token before allowing access

### Database Relationships
- **Families** have many **Admins**, **People**, **Chores**, and **Assignments**
- **Assignments** link **People** to **Chores** on specific days
- Foreign keys ensure data integrity (can't delete a family if people still reference it)
