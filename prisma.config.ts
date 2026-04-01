import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // Burada doğrudan URL'yi vererek Prisma'nın kafasındaki karışıklığı gideriyoruz
    url: process.env.DATABASE_URL ?? "",
  },
});