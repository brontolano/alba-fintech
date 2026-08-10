import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      unit: string
      unitType?: string
      image?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    unit: string
    unitType?: string
    retailModuleEnabled?: boolean
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    unit: string
    unitType?: string
    retailModuleEnabled?: boolean
    image?: string | null
  }
}
