import { Request, Response, NextFunction } from 'express'

declare module 'express-session' {
  interface SessionData {
    userId: number
    role: string
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nejste přihlášeni' })
  }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nejste přihlášeni' })
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Nemáte oprávnění' })
  }
  next()
}
