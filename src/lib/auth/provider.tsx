'use client'

import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react'

export { useSession, signIn, signOut }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
