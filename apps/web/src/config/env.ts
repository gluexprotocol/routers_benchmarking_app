import { createEnv } from "@t3-oss/env-nextjs";
import z from "zod";

const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_COMPARE_PAGE_PASSWORD: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_COMPARE_PAGE_PASSWORD:
      process.env.NEXT_PUBLIC_COMPARE_PAGE_PASSWORD,
  },
});

export default env;
