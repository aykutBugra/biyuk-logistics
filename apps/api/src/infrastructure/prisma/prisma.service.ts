import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private prismaClient: PrismaClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  get client(): PrismaClient {
    if (!this.prismaClient) {
      const databaseUrl =
        this.configService.get<string>("DATABASE_URL") ?? process.env.DATABASE_URL;

      if (!databaseUrl) {
        throw new Error("DATABASE_URL is required for Prisma client initialization.");
      }

      this.prismaClient = new PrismaClient({
        adapter: new PrismaPg(databaseUrl),
      });
    }

    return this.prismaClient;
  }

  async onModuleDestroy() {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
    }
  }
}
