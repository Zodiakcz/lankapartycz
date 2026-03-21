import express from 'express'
import session from 'express-session'
import cors from 'cors'
import authRoutes from './routes/auth'
import partyRoutes from './routes/parties'
import attendanceRoutes from './routes/attendance'
import gameRoutes from './routes/games'
import scheduleRoutes from './routes/schedule'
import expenseRoutes from './routes/expenses'
import packingRoutes from './routes/packing'

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/parties', partyRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/games', gameRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/packing', packingRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server běží na portu ${PORT}`)
})
