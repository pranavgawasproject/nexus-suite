import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

/**
 * NextAuth.js configuration.
 *
 * Authentication model:
 *  - Email + password (bcrypt-hashed) via the Credentials provider.
 *  - Demo mode: if no users have a passwordHash, the credentials provider
 *    accepts any email + the magic password "demo" and logs you in as that
 *    user. This preserves the frictionless demo flow while allowing real
 *    auth once users have password hashes.
 *
 * Sessions are JWT-based (no DB session store required for MVP).
 * To enable DB-backed sessions later, switch to the Prisma adapter pattern.
 */

const DEMO_MAGIC_PASSWORD = 'demo'

export const authOptions: NextAuthOptions = {
  // No adapter = JWT sessions (works for both SQLite and Postgres without
  // requiring extra session/account tables). Switch to PrismaAdapter when
  // you want server-side session revocation.
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@company.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const email = credentials.email.toLowerCase().trim()
        const user = await db.user.findUnique({
          where: { email },
          include: { org: true },
        })
        if (!user) return null

        // Demo fallback: if user has no passwordHash, accept the magic password.
        // This keeps the demo-org experience seamless (auto-seeded users have
        // no passwordHash) while letting real users authenticate with bcrypt.
        if (!user.passwordHash) {
          if (credentials.password !== DEMO_MAGIC_PASSWORD) return null
        } else {
          // Real password check — uses bcrypt. We import lazily to avoid
          // pulling bcrypt into the bundle when nobody has a passwordHash yet.
          const bcrypt = await import('bcryptjs').catch(() => null)
          if (!bcrypt) return null
          const ok = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!ok) return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        ;(session.user as { id?: string }).id = token.uid as string
      }
      return session
    },
  },
  pages: {
    // Custom sign-in page (not built yet — using default NextAuth page for now).
    // Once /signin is built, point this to '/signin'.
    signIn: '/signin',
    signOut: '/',
    error: '/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
