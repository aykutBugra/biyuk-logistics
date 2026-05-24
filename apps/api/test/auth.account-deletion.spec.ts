import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { AuthService } from "../src/modules/auth/auth.service";
import { JwtStrategy } from "../src/modules/auth/jwt.strategy";
import { type AuthUserRecord, UsersService } from "../src/modules/users/users.service";

describe("AuthService account deletion behavior", () => {
  const activeUser: AuthUserRecord = {
    id: 15,
    publicId: "550e8400-e29b-41d4-a716-446655440015",
    ad: "Aykut",
    soyad: "Test",
    mail: "aykut@example.com",
    kullaniciAdi: "aykut",
    telefonNumarasi: null,
    sifreHash: "hash",
    roles: [ROLE_NAMES.MUSTERI],
  };

  function createService(
    usersServiceOverrides: Partial<{
      findActiveByIdentifier: jest.Mock;
      deleteOwnAccount: jest.Mock;
    }> = {}
  ) {
    const usersServiceMock = {
      findActiveByIdentifier: jest.fn(),
      deleteOwnAccount: jest.fn(),
      ...usersServiceOverrides,
    };

    const service = new AuthService(
      usersServiceMock as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );

    return {
      service,
      usersServiceMock,
    };
  }

  it("rejects login for an inactive or deleted user", async () => {
    const { service, usersServiceMock } = createService();
    usersServiceMock.findActiveByIdentifier.mockResolvedValue(null);

    await expect(
      service.login({
        identifier: activeUser.mail,
        password: "password123",
      })
    ).rejects.toThrow(new UnauthorizedException("Invalid credentials."));
  });

  it("delegates self deletion to UsersService", async () => {
    const { service, usersServiceMock } = createService();

    await service.deleteCurrentUser({
      id: activeUser.id,
      publicId: activeUser.publicId,
      mail: activeUser.mail,
      kullaniciAdi: activeUser.kullaniciAdi,
      roles: activeUser.roles,
    });

    expect(usersServiceMock.deleteOwnAccount).toHaveBeenCalledWith(activeUser.id);
  });
});

describe("JwtStrategy active user validation", () => {
  const activeUser: AuthUserRecord = {
    id: 21,
    publicId: "550e8400-e29b-41d4-a716-446655440021",
    ad: "Carrier",
    soyad: "User",
    mail: "carrier@example.com",
    kullaniciAdi: "carrier-user",
    telefonNumarasi: null,
    sifreHash: "hash",
    roles: [ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI],
  };

  let usersServiceMock: {
    findActiveById: jest.Mock;
    findActiveByPublicId: jest.Mock;
  };
  let strategy: JwtStrategy;

  beforeEach(async () => {
    usersServiceMock = {
      findActiveById: jest.fn(),
      findActiveByPublicId: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => "access-secret"),
          },
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it("returns the current persisted identity for active users", async () => {
    usersServiceMock.findActiveByPublicId.mockResolvedValue(activeUser);

    await expect(
      strategy.validate({
        sub: activeUser.publicId,
        mail: "stale@example.com",
        kullaniciAdi: "stale-username",
        roles: [ROLE_NAMES.ADMIN],
      })
    ).resolves.toEqual({
      id: activeUser.id,
      publicId: activeUser.publicId,
      mail: activeUser.mail,
      kullaniciAdi: activeUser.kullaniciAdi,
      roles: activeUser.roles,
    });
  });

  it("rejects deleted users even when the JWT is otherwise valid", async () => {
    usersServiceMock.findActiveByPublicId.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: activeUser.publicId,
        mail: activeUser.mail,
        kullaniciAdi: activeUser.kullaniciAdi,
        roles: activeUser.roles,
      })
    ).rejects.toThrow(UnauthorizedException);
  });
});
