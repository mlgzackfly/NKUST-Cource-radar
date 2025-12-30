// Minimal stubs to keep TypeScript happy before dependencies are installed/generated.
// Once node_modules are installed, the real types from `next` / `@prisma/client` will be used.

declare module "next/server" {
  export class NextResponse {
    static json(body: unknown, init?: unknown): unknown;
  }
}

declare module "next/navigation" {
  export function notFound(): never;
}

declare module "next" {
  const anyExport: unknown;
  export default anyExport;
}

declare module "next/image-types/global" {}

declare module "@prisma/client" {
  export class PrismaClient {
    constructor(options?: unknown);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  // Minimal namespace to satisfy `import type { Prisma } from "@prisma/client"`
  // before Prisma Client is generated.
  export namespace Prisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export type CourseWhereInput = any;
  }
}
