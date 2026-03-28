import type { NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as Record<string, unknown>).id = token.sub;
        (session.user as Record<string, unknown>).username = token.username;
        (session.user as Record<string, unknown>).twitter_id = token.twitter_id;
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.username = (profile as Record<string, unknown>).username;
        token.twitter_id = account.providerAccountId;
      }
      return token;
    },
  },
  pages: { signIn: '/onboarding' },
  secret: process.env.NEXTAUTH_SECRET,
};

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string;
  twitter_id?: string;
};
