import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

interface RegisterUserPayload {
  email: string
  name: string
  password: string
  workspaceName: string
}

interface LoginUserPayload {
  email: string
  password: string
}

interface TokenPayload {
  id: string
  email: string
  role: string
  workspaceId: string
}

interface RefreshTokenPayload {
  id: string
}

class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export const authService = {
  async registerUser(
    email: string,
    name: string,
    password: string,
    workspaceName: string
  ) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new AuthError('EMAIL_EXISTS', 'Email already in use')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create workspace
    const slug = workspaceName.toLowerCase().replace(/\s+/g, '-')
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        slug,
      },
    })

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        workspaceId: workspace.id,
        role: 'QA_ENGINEER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        workspaceId: true,
      },
    })

    return { user, workspace }
  },

  async loginUser(email: string, password: string) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { workspace: true },
    })

    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    // Generate access token (15 minutes)
    const accessTokenSecret = process.env.JWT_SECRET
    if (!accessTokenSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const accessTokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    }

    const accessToken = jwt.sign(accessTokenPayload, accessTokenSecret, {
      expiresIn: '15m',
    })

    // Generate refresh token (7 days)
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET
    if (!refreshTokenSecret) {
      throw new Error('JWT_REFRESH_SECRET not configured')
    }

    const refreshTokenPayload: RefreshTokenPayload = {
      id: user.id,
    }

    const refreshToken = jwt.sign(refreshTokenPayload, refreshTokenSecret, {
      expiresIn: '7d',
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId,
      },
    }
  },

  async refreshAccessToken(refreshToken: string) {
    // Verify refresh token
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET
    if (!refreshTokenSecret) {
      throw new Error('JWT_REFRESH_SECRET not configured')
    }

    let payload: RefreshTokenPayload

    try {
      payload = jwt.verify(refreshToken, refreshTokenSecret) as RefreshTokenPayload
    } catch (err) {
      throw new AuthError('UNAUTHORIZED', 'Invalid or expired refresh token')
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    })

    if (!user) {
      throw new AuthError('UNAUTHORIZED', 'User not found')
    }

    // Generate new access token
    const accessTokenSecret = process.env.JWT_SECRET
    if (!accessTokenSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const accessTokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    }

    const accessToken = jwt.sign(accessTokenPayload, accessTokenSecret, {
      expiresIn: '15m',
    })

    // Generate new refresh token (always rotate)
    const newRefreshTokenSecret = process.env.JWT_REFRESH_SECRET
    if (!newRefreshTokenSecret) {
      throw new Error('JWT_REFRESH_SECRET not configured')
    }

    const newRefreshTokenPayload: RefreshTokenPayload = {
      id: user.id,
    }

    const newRefreshToken = jwt.sign(newRefreshTokenPayload, newRefreshTokenSecret, {
      expiresIn: '7d',
    })

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId,
      },
    }
  },
}

export { AuthError }
