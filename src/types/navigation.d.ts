import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

declare module "next/navigation" {
  /**
   * A [Client Component](https://nextjs.org/docs/app/building-your-application/rendering/client-components) hook
   * that lets you programmatically change routes inside Client Components.
   */
  export function useRouter(): AppRouterInstance;
}
