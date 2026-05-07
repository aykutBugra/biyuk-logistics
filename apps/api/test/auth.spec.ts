import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import authConfig from "../src/config/auth.config";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AuthService } from "../src/modules/auth/auth.service";
import { RolesService } from "../src/modules/roles/roles.service";
import { type AuthUserRecord, UsersService } from "../src/modules/users/users.service";

describe("Auth hardening", () => {
  describe("auth config", () => {
    const originalAccessSecret = process.env.JWT_ACCESS_SECRET;
    const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

    afterEach(() => {
      if (originalAccessSecret === undefined) {
        delete process.env.JWT_ACCESS_SECRET;
      } else {
        process.env.JWT_ACCESS_SECRET = originalAccessSecret;
      }

      if (originalRefreshSecret === undefined) {
        delete process.env.JWT_REFRESH_SECRET;
      } else {
        process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
      }
    });

    it("fails fast when the access secret is missing", () => {
      delete process.env.JWT_ACCESS_SECRET;
      process.env.JWT_REFRESH_SECRET = "refresh-secret";

      expect(() => authConfig()).toThrow("JWT_ACCESS_SECRET is required.");
    });

    it("fails fast when the refresh secret is missing", () => {
      process.env.JWT_ACCESS_SECRET = "access-secret";
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => authConfig()).toThrow("JWT_REFRESH_SECRET is required.");
    });
  });

  describe("refresh", () => {
    const activeUser: AuthUserRecord = {
      id: 99,
      ad: "Aykut",
      soyad: "Test",
      mail: "aykut@example.com",
      kullaniciAdi: "aykut",
      telefonNumarasi: null,
      sifreHash: "hash",
      roles: ["MUSTERI"],
    };

    let service: AuthService;
    let usersServiceMock: {
      findActiveById: jest.Mock;
    };
    let jwtServiceMock: {
      verifyAsync: jest.Mock;
      signAsync: jest.Mock;
    };
    let configServiceMock: {
      getOrThrow: jest.Mock;
    };

    beforeEach(async () => {
      usersServiceMock = {
        findActiveById: jest.fn(),
      };
      jwtServiceMock = {
        verifyAsync: jest.fn(),
        signAsync: jest.fn(),
      };
      configServiceMock = {
        getOrThrow: jest.fn((key: string) => {
          const values: Record<string, string> = {
            "auth.accessSecret": "access-secret",
            "auth.accessTtl": "15m",
            "auth.refreshSecret": "refresh-secret",
            "auth.refreshTtl": "7d",
          };

          return values[key];
        }),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthService,
          {
            provide: UsersService,
            useValue: usersServiceMock,
          },
          {
            provide: RolesService,
            useValue: {},
          },
          {
            provide: PrismaService,
            useValue: {},
          },
          {
            provide: JwtService,
            useValue: jwtServiceMock,
          },
          {
            provide: ConfigService,
            useValue: configServiceMock,
          },
        ],
      }).compile();

      service = moduleRef.get(AuthService);
    });

    it("issues a fresh token pair for an active user", async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: activeUser.id,
        type: "refresh",
      });
      usersServiceMock.findActiveById.mockResolvedValue(activeUser);
      jwtServiceMock.signAsync
        .mockResolvedValueOnce("next-access-token")
        .mockResolvedValueOnce("next-refresh-token");

      const response = await service.refresh("valid-refresh-token");

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith("valid-refresh-token", {
        secret: "refresh-secret",
      });
      expect(response).toEqual({
        accessToken: "next-access-token",
        refreshToken: "next-refresh-token",
        tokenType: "Bearer",
      });
    });

    it("rejects invalid refresh tokens", async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error("bad token"));

      await expect(service.refresh("invalid-refresh-token")).rejects.toThrow(
        new UnauthorizedException("Invalid refresh token.")
      );
    });

    it("rejects refresh attempts for inactive users", async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: activeUser.id,
        type: "refresh",
      });
      usersServiceMock.findActiveById.mockResolvedValue(null);

      await expect(service.refresh("inactive-refresh-token")).rejects.toThrow(
        new UnauthorizedException("Invalid refresh token.")
      );
    });
  });
});
