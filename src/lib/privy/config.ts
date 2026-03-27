import type { PrivyClientConfig } from "@privy-io/react-auth";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "twitter", "wallet"],
  embeddedWallets: {
    createOnLogin: "all-users",
  },
  appearance: {
    theme: "dark",
  },
};
