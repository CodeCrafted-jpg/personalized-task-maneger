# Task Manager - Implementation Documentation

## Project Overview

**Task Manager** is a modern, feature-rich web application built with Next.js, React, and TypeScript that serves as a unified control center for managing daily tasks and activities. The application integrates multiple services including voice-based task management, calendar scheduling, Telegram reminders, and Reddit feed browsing.

### Key Features
- ✅ **Task Management**: Create, edit, delete, and complete tasks
- 🎤 **Voice Input**: Add tasks using speech-to-text with AI intent recognition
- 📅 **Calendar Integration**: View tasks on a calendar with due date tracking
- 📱 **Telegram Reminders**: Configure and send task reminders via Telegram bot
- 🔗 **Reddit Feed**: Browse top posts from customizable subreddits
- 🎨 **Modern UI**: Glassmorphism design with Tailwind CSS and Framer Motion animations

---

## Architecture & Stack

### Frontend Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + PostCSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: React Hooks (local state)

### Backend Stack
- **Runtime**: Node.js (via Next.js)
- **Database**: MongoDB with Mongoose ODM
- **AI/NLP**: Cohere API (for voice command processing)
- **External APIs**: Reddit API, Telegram Bot API

### Project Structure
```
task_manager/
├── app/                          # Next.js App Router directory
│   ├── layout.tsx               # Root layout with global styles
│   ├── page.tsx                 # Home page (main dashboard)
│   ├── globals.css              # Global styling
│   ├── api/                     # API routes (backend endpoints)
│   │   ├── tasks/
│   │   │   ├── route.ts         # Task CRUD (GET/POST)
│   │   │   └── [id]/
│   │   │       └── route.ts     # Individual task operations (PUT/DELETE)
│   │   ├── voice/
│   │   │   └── route.ts         # Voice command processing via Cohere AI
│   │   ├── reddit/
│   │   │   └── route.ts         # Reddit posts fetching
│   │   ├── calendar/
│   │   │   └── route.ts         # Tasks with due dates
│   │   └── telegram/
│   │       └── remind/
│   │           └── route.ts     # Telegram reminder trigger
│
├── components/                   # Reusable React components
│   ├── TaskManager.tsx          # Main task management interface
│   ├── Calendar.tsx             # Calendar view with task dates
│   ├── RedditFeed.tsx           # Reddit posts display
│   └── TelegramConfig.tsx       # Telegram bot configuration
│
├── lib/                         # Utility functions and helpers
│   ├── mongodb.ts              # MongoDB connection with caching
│   └── models/
│       └── Task.ts             # Mongoose Task schema
│
├── public/                      # Static assets
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── postcss.config.mjs         # PostCSS configuration
├── eslint.config.mjs          # ESLint configuration
└── README.md                  # Basic setup guide
```

---

## Core Components

### 1. TaskManager Component (`components/TaskManager.tsx`)
**Purpose**: Main interface for creating, editing, and managing tasks

**Key Features**:
- Create tasks with optional due dates
- Voice input using Web Speech API with AI intent recognition
- Edit existing tasks inline
- Mark tasks as complete/incomplete
- Delete tasks
- Real-time task list updates
- Loading states and error handling

**State Management**:
```typescript
- tasks: Task[]              // All tasks from database
- input: string             // New task text input
- dueDate: string          // Due date for new task
- loading: boolean         // Loading indicator
- editingId: string | null // Currently edited task ID
- isListening: boolean     // Voice recording state
- transcript: string       // Voice recognition transcript
```

**API Calls**:
- `GET /api/tasks` - Fetch all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `POST /api/voice` - Process voice command

### 2. Calendar Component (`components/Calendar.tsx`)
**Purpose**: Display tasks organized by calendar dates

**Key Features**:
- Monthly calendar view with navigation
- Highlight days with due tasks
- Show task count badges on calendar dates
- Click to view tasks for a specific date
- Task completion indicators
- Month/year navigation controls

**State Management**:
```typescript
- year: number              // Current year
- month: number             // Current month (0-11)
- allTasks: Task[]         // Tasks with due dates
- selectedDay: number | null // Selected day to view
- selectedTasks: Task[]    // Tasks for selected day
```

### 3. RedditFeed Component (`components/RedditFeed.tsx`)
**Purpose**: Display trending Reddit posts from selected subreddits

**Key Features**:
- Customizable subreddit selection (default: 'webdev')
- Sort options: top, new, hot, rising
- Click to view original Reddit posts
- Upvote count display
- Responsive grid layout
- Error handling for API failures

### 4. TelegramConfig Component (`components/TelegramConfig.tsx`)
**Purpose**: Configure and manage Telegram bot settings for reminders

**Key Features**:
- Input Telegram bot token and chat ID
- Save configuration to localStorage
- Test message sending
- Visual status indicators (success/error)
- Clear existing configuration
- Persistent storage across sessions

**Storage**:
- `tg_token`: Telegram bot token
- `tg_chat_id`: Telegram chat ID for user

---

## API Routes

### Tasks API

#### GET `/api/tasks`
Fetches all tasks from the database.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "text": "Complete project",
      "completed": false,
      "dueDate": "2026-03-15T00:00:00Z",
      "createdAt": "2026-03-04T10:30:00Z"
    }
  ]
}
```

#### POST `/api/tasks`
Creates a new task.

**Request Body**:
```json
{
  "text": "Buy groceries",
  "dueDate": "2026-03-10",
  "completed": false
}
```

**Response**: Returns created task object with `_id`

#### PUT `/api/tasks/[id]`
Updates an existing task (completion, text, due date).

#### DELETE `/api/tasks/[id]`
Deletes a task by ID.

### Voice API

#### POST `/api/voice`
Processes voice commands and extracts intent using Cohere AI.

**Request**:
```json
{
  "text": "Add buy milk to my todo list"
}
```

**Response**:
```json
{
  "success": true,
  "action": "CREATE",
  "task": "buy milk"
}
```

**Fallback (no API key)**:
- If `COHERE_API_KEY` is not set, uses keyword matching for simple intents
- Supports: "add/create", "delete/remove", or returns "UNKNOWN"

### Reddit API

#### GET `/api/reddit?sub=webdev&sort=top`
Fetches posts from a subreddit.

**Query Parameters**:
- `sub` (string, default: "webdev"): Subreddit name
- `sort` (string, default: "top"): Sort method (top, new, hot, rising)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "title": "JavaScript best practices",
      "url": "/r/webdev/comments/abc123/javascript_best_practices",
      "subreddit": "r/webdev",
      "ups": 2500
    }
  ]
}
```

**Features**:
- 60-second ISR (Incremental Static Regeneration) caching on Vercel
- Rate limiting via User-Agent header
- Validates sort parameter for security

### Calendar API

#### GET `/api/calendar`
Fetches tasks with due dates for calendar display.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "text": "Meeting at 2pm",
      "dueDate": "2026-03-10T14:00:00Z",
      "completed": false
    }
  ]
}
```

### Telegram API

#### POST `/api/telegram/remind`
Sends a Telegram message to configured user.

**Request**:
```json
{
  "token": "123456:ABCDEF...",
  "chatId": "12345678",
  "message": "Reminder: Buy milk"
}
```

**Implementation**:
- Uses Telegram Bot API endpoint: `https://api.telegram.org/bot{token}/sendMessage`
- POST request with `chat_id` and `text` parameters
- Returns status and message ID on success

---

## Database Schema

### Task Model (`lib/models/Task.ts`)

```typescript
{
  _id: ObjectId,           // MongoDB auto-generated ID
  text: String,            // Task description (required, max 200 chars)
  completed: Boolean,      // Completion status (default: false)
  dueDate: Date,          // Optional due date for calendar
  createdAt: Date         // Timestamp (auto-set to current date)
}
```

**Validation**:
- `text`: Required, max 200 characters
- `completed`: Boolean, defaults to false
- `dueDate`: Optional date field
- `createdAt`: Auto-set on document creation

**Indexes**:
- Tasks are sorted by `createdAt` in descending order (newest first)

---

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# MongoDB Connection (required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# Cohere AI API (optional, for voice commands)
COHERE_API_KEY=your_cohere_api_key_here

# Vercel deployment (auto-set on Vercel)
VERCEL_URL=https://your-domain.vercel.app
```

### Setup Instructions

1. **MongoDB Atlas Setup**:
   - Create account at mongodb.com
   - Create a cluster
   - Generate connection string
   - Replace in `MONGODB_URI`

2. **Cohere API Setup** (optional):
   - Create account at cohere.ai
   - Generate API key
   - Add to `COHERE_API_KEY`
   - If not set, voice commands use basic keyword matching

3. **Telegram Setup**:
   - Create Telegram bot via @BotFather
   - Get bot token
   - Configure token in TelegramConfig component (stored in localStorage)

---

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Git

### Installation Steps

```bash
# Clone repository
git clone <repo-url>
cd task_manager

# Install dependencies
npm install

# Create .env.local with MongoDB URI
echo "MONGODB_URI=your_mongodb_uri" > .env.local

# Run development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

### Build for Production

```bash
# Build optimized bundle
npm run build

# Start production server
npm start
```

### Linting

```bash
# Run ESLint
npm run lint
```

---

## Authentication & Security

### Current State
- **No authentication**: Application is publicly accessible
- **Client-side storage**: Telegram config stored in browser localStorage
- **API access**: No API key validation on endpoints

### Recommended Enhancements
1. Implement user authentication (NextAuth.js, Clerk, or Auth0)
2. Add per-user task isolation with MongoDB user IDs
3. Secure Telegram token storage (encrypted DB field, not localStorage)
4. Add API route protection with middleware
5. Implement CORS policies
6. Rate limiting on API endpoints

---

## Performance Optimizations

### Implemented
- **ISR Caching**: Reddit feed cached for 60 seconds
- **Database Connection Pooling**: Mongoose with cached connection
- **Component Lazy Loading**: Dynamic imports where applicable
- **CSS Optimization**: Tailwind CSS with PostCSS purging
- **Image Optimization**: Next.js Image component ready for use

### Opportunities
1. Add request debouncing for voice input
2. Implement pagination for task lists
3. Add offline support with service workers
4. Optimize re-renders with React.memo and useMemo
5. Add error boundary components

---

## Deployment

### Vercel Deployment (Recommended)

```bash
# Push to GitHub
git push origin main

# Connect to Vercel via vercel.com
# 1. Import project from GitHub
# 2. Add environment variables in Project Settings
# 3. Auto-deploy on every push

# Or deploy via CLI:
npm i -g vercel
vercel
```

### Environment Variables on Vercel
Set in Project Settings → Environment Variables:
- `MONGODB_URI`
- `COHERE_API_KEY` (optional)

### Vercel Configuration
The project includes `vercel.json` for deployment configuration.

---

## Development Workflow

### File Structure Best Practices
- API routes handle business logic and database operations
- Components contain UI logic and state management
- Lib folder contains reusable utilities and models
- CSS is component and global level

### Adding a New Feature
1. Create API route in `app/api/[feature]/route.ts`
2. Create component in `components/[Feature].tsx`
3. Import and use in `app/page.tsx`
4. Add TypeScript interfaces for type safety
5. Test with dev server `npm run dev`

### Adding a New Task Field
1. Update Task schema in `lib/models/Task.ts`
2. Update TaskManager API calls
3. Update TaskManager component state
4. Update TaskManager UI
5. Test form submission and retrieval

---

## Troubleshooting

### MongoDB Connection Issues
```
Error: "Please define the MONGODB_URI environment variable"
→ Check .env.local has MONGODB_URI set correctly
→ Verify MongoDB Atlas IP whitelist (allow all or add your IP)
```

### Voice Recognition Not Working
```
→ Check browser supports Web Speech API (Chrome, Edge, Safari)
→ Verify microphone permissions granted
→ Check COHERE_API_KEY is set (optional, works with keyword fallback)
```

### Telegram Messages Not Sending
```
→ Verify token is valid from @BotFather
→ Verify chat ID is correct (use /start command with bot first)
→ Check token/chatId are saved in localStorage
```

### Reddit Feed Shows Empty
```
→ Verify subreddit name exists
→ Check rate limiting (Reddit allows ~1 request per second)
→ Use valid sort parameter (top, new, hot, rising)
```

---

## Future Enhancements

### Planned Features
1. **User Authentication**: Multi-user support with user accounts
2. **Task Categories**: Organize tasks by projects or categories
3. **Recurring Tasks**: Set repeating tasks (daily, weekly, etc.)
4. **Task Notifications**: Browser push notifications for due dates
5. **Analytics Dashboard**: Productivity metrics and charts
6. **Dark/Light Mode**: Theme toggle with persistence
7. **Mobile App**: React Native version for iOS/Android
8. **Sync**: Real-time sync across devices with WebSockets
9. **Collaboration**: Share tasks and assign to others
10. **Integration Expansion**: Slack, Discord, Google Calendar

### Technical Debt
1. Add comprehensive error handling
2. Implement API request validation (Zod/Joi)
3. Add unit and integration tests
4. Set up CI/CD pipeline
5. Add API documentation (OpenAPI/Swagger)
6. Implement proper logging system
7. Add accessibility improvements (WCAG compliance)

---

## Dependencies Overview

### Production Dependencies
- **next**: React framework with SSR/SSG
- **react/react-dom**: UI library
- **mongoose**: MongoDB object modeling
- **cohere-ai**: AI-powered text generation for voice intent
- **lucide-react**: Icon library (100+ icons)
- **framer-motion**: Animation library for React
- **tailwind-merge**: Utility for merging Tailwind classes
- **clsx**: Conditional className utility

### Dev Dependencies
- **@tailwindcss/postcss**: Tailwind CSS v4
- **TypeScript**: Static type checking
- **ESLint**: Code linting
- **tailwindcss**: Utility-first CSS framework
- **postcss**: CSS transformation

---

## Version Information
- **Project**: Task Manager v0.1.0
- **Last Updated**: March 2026
- **Node Version**: 18+
- **Next.js Version**: 16.1.6

---

## License & Attribution
This is a personal project built with modern web technologies.

---

## Quick Reference Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm start           # Start production server
npm run lint        # Run ESLint

# Database
# Connect via MongoDB Atlas or local MongoDB

# API Testing
# GET  /api/tasks
# POST /api/tasks
# PUT  /api/tasks/[id]
# DELETE /api/tasks/[id]
```

