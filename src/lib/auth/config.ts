import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { db } from '@/lib/db'

/**
 * NextAuth.js configuration.
 *
 * Authentication providers:
 *  1. Credentials (email + password, bcrypt-hashed)
 *     - Demo fallback: if user has no passwordHash, magic password "demo" works.
 *  2. Google OAuth — enabled if GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
 *  3. GitHub OAuth — enabled if GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET are set.
 *
 * OAuth sign-in flow:
 *  - If a user with the OAuth email exists in the org, they're logged in.
 *  - If not, a new user is auto-provisioned in the demo org (slug: acme-design).
 *    In production, you'd want to gate this behind an invite flow or admin approval.
 *
 * Sessions are JWT-based (no DB session store required for MVP).
 */

const DEMO_MAGIC_PASSWORD = 'demo'

// Conditionally add OAuth providers only if env vars are configured.
// This lets the app run without OAuth configured (e.g. for local dev or
// self-hosted installs that only want password auth).
const providers: NextAuthOptions['providers'] = [
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
      if (!user.passwordHash) {
        if (credentials.password !== DEMO_MAGIC_PASSWORD) return null
      } else {
        const bcrypt = await import('bcryptjs').catch(() => null)
        if (!bcrypt) return null
        const ok = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!ok) return null
      }

      return { id: user.id, email: user.email, name: user.name }
    },
  }),
]

// Google OAuth — only if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  )
}

// GitHub OAuth — only if configured
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  )
}

/**
 * Find or create a user from an OAuth profile.
 * Called by the signIn callback when an OAuth provider authenticates successfully.
 */
async function findOrCreateOAuthUser(profile: {
  email?: string | null
  name?: string | null
  image?: string | null
}): Promise<string | null> {
  if (!profile.email) return null
  const email = profile.email.toLowerCase().trim()

  // Check if user exists
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return existing.id

  // Auto-provision in the demo org (or first org)
  const org = await db.organization.findFirst({
    where: { slug: 'acme-design' },
  }) || await db.organization.findFirst()

  if (!org) return null

  const newUser = await db.user.create({
    data: {
      email,
      name: profile.name || email.split('@')[0],
      avatarUrl: profile.image || null,
      role: 'employee',
      orgId: org.id,
    },
  })

  return newUser.id
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.uid = user.id
      }
      // For OAuth sign-ins, account is set — find/create the user
      if (account?.provider && account.provider !== 'credentials' && user?.email) {
        const userId = await findOrCreateOAuthUser({
          email: user.email,
          name: user.name,
          image: user.image,
        })
        if (userId) token.uid = userId
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
    signIn: '/signin',
    signOut: '/',
    error: '/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
