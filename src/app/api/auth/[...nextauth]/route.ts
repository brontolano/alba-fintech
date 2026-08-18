import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { unit: { select: { name: true, type: true, retailEnabled: true } } },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          unitId: user.unitId,
          unit: user.unit?.name,
          unitType: user.unit?.type,
          image: user.image,
          retailModuleEnabled: user.unit?.retailEnabled ?? false,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.tenantId = (user as any).tenantId
        token.unitId = (user as any).unitId
        token.unit = user.unit
        token.unitType = (user as any).unitType
        token.image = user.image
        token.retailModuleEnabled = (user as any).retailModuleEnabled
      }

      if (trigger === "update" && token.id) {
        const current = await prisma.user.findUnique({
          where: { id: Number(token.id) },
          include: { unit: { select: { name: true, type: true, retailEnabled: true } } },
        })

        if (current) {
          token.name = current.name
          token.image = current.image
          token.unit = current.unit?.name
          token.unitType = current.unit?.type
          token.retailModuleEnabled = current.unit?.retailEnabled ?? false
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as number | null
        session.user.unitId = token.unitId as number | null
        session.user.unit = token.unit as string
        session.user.unitType = token.unitType as string
        session.user.retailModuleEnabled = token.retailModuleEnabled as boolean
        session.user.image = token.image as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }