import type { PrivyClientConfig } from '@privy-io/react-auth';

export const privyConfig: PrivyClientConfig = {
  // Keep wallet out for now — WalletConnect requires extra config
  loginMethods: ['email', 'twitter'],
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'all-users',
    },
  },
  appearance: {
    theme: 'dark',
    accentColor: '#10b981',
  },
};
