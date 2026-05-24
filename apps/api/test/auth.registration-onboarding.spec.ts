import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AuthService } from "../src/modules/auth/auth.service";
import { RolesService } from "../src/modules/roles/roles.service";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { type AuthUserRecord, UsersService } from "../src/modules/users/users.service";

function createUniquePlateError(): Prisma.PrismaClientKnownRequestError {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype
  ) as Prisma.PrismaClientKnownRequestError;

  Object.assign(error, {
    code: "P2002",
    clientVersion: "test",
    meta: {
      target: ["plaka"],
    },
    message: "Unique constraint failed.",
  });

  return error;
}

describe("AuthService registration and carrier onboarding", () => {
  const customerUser: AuthUserRecord = {
    id: 10,
    publicId: "550e8400-e29b-41d4-a716-446655440010",
    ad: "Aykut",
    soyad: "Test",
    mail: "aykut@example.com",
    kullaniciAdi: "aykut",
    telefonNumarasi: null,
    customerIntroDismissedAt: null,
    carrierIntroDismissedAt: null,
    sifreHash: "hash",
    roles: [ROLE_NAMES.MUSTERI],
  };

  const dualRoleUser: AuthUserRecord = {
    ...customerUser,
    roles: [ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI],
  };

  let service: AuthService;
  let usersServiceMock: {
    createUserWithResolvedRoleIdInTransaction: jest.Mock;
    dismissDashboardIntro: jest.Mock;
    existsByMail: jest.Mock;
    existsByUsername: jest.Mock;
    findActiveById: jest.Mock;
    findActiveByIdentifier: jest.Mock;
    findProfileById: jest.Mock;
    toUserProfile: jest.Mock;
  };
  let rolesServiceMock: {
    requireRoleId: jest.Mock;
    assignRoleToUserInTransaction: jest.Mock;
  };
  let jwtServiceMock: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let prismaMock: {
    client: {
      $transaction: jest.Mock;
    };
  };
  let transactionClientMock: {
    aracKutuphanesi: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    arac: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    usersServiceMock = {
    createUserWithResolvedRoleIdInTransaction: jest.fn(),
    dismissDashboardIntro: jest.fn(),
    existsByMail: jest.fn().mockResolvedValue(false),
    existsByUsername: jest.fn().mockResolvedValue(false),
      findActiveById: jest.fn(),
      findActiveByIdentifier: jest.fn(),
      findProfileById: jest.fn(),
      toUserProfile: jest.fn((user) => ({
        id: user.publicId,
        ad: user.ad,
        soyad: user.soyad,
        mail: user.mail,
        kullaniciAdi: user.kullaniciAdi,
        telefonNumarasi: user.telefonNumarasi,
        customerIntroDismissedAt: user.customerIntroDismissedAt ?? null,
        carrierIntroDismissedAt: user.carrierIntroDismissedAt ?? null,
        roles: user.roles,
        businessRoles: user.roles.filter((role: string) => role !== ROLE_NAMES.ADMIN),
        isAdmin: false,
      })),
    };
    rolesServiceMock = {
      requireRoleId: jest.fn(),
      assignRoleToUserInTransaction: jest.fn(),
    };
    jwtServiceMock = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };
    transactionClientMock = {
      aracKutuphanesi: {
        findFirst: jest.fn().mockResolvedValue({ id: 77 }),
        create: jest.fn(),
      },
      arac: {
        create: jest.fn().mockResolvedValue({ id: 501 }),
      },
    };
    prismaMock = {
      client: {
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
          callback(transactionClientMock)
        ),
      },
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
          useValue: rolesServiceMock,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string> = {
                "auth.accessSecret": "access-secret",
                "auth.accessTtl": "15m",
                "auth.refreshSecret": "refresh-secret",
                "auth.refreshTtl": "7d",
              };

              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it("registers a MUSTERI account without assigning NAKLIYECI", async () => {
    rolesServiceMock.requireRoleId.mockResolvedValue(1);
    usersServiceMock.createUserWithResolvedRoleIdInTransaction.mockResolvedValue(customerUser);
    usersServiceMock.findActiveById.mockResolvedValue(customerUser);
    jwtServiceMock.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");

    const response = await service.register({
      ad: "Aykut",
      soyad: "Test",
      mail: "aykut@example.com",
      kullaniciAdi: "aykut",
      password: "password123",
      role: ROLE_NAMES.MUSTERI,
    });

    expect(usersServiceMock.createUserWithResolvedRoleIdInTransaction).toHaveBeenCalledWith(
      transactionClientMock,
      expect.objectContaining({
        roleId: 1,
      })
    );
    expect(rolesServiceMock.assignRoleToUserInTransaction).not.toHaveBeenCalled();
    expect(response.user?.roles).toEqual([ROLE_NAMES.MUSTERI]);
  });

  it("registers a NAKLIYECI account as dual-role after the first vehicle is created", async () => {
    rolesServiceMock.requireRoleId.mockResolvedValue(1);
    usersServiceMock.createUserWithResolvedRoleIdInTransaction.mockResolvedValue(customerUser);
    usersServiceMock.findActiveById.mockResolvedValue(dualRoleUser);
    jwtServiceMock.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");

    const response = await service.register({
      ad: "Aykut",
      soyad: "Test",
      mail: "aykut@example.com",
      kullaniciAdi: "aykut",
      password: "password123",
      role: ROLE_NAMES.NAKLIYECI,
      marka: "Mercedes",
      model: "Actros",
      plaka: "34 ABC 123",
      yil: 2023,
      maksimumAgirlikKg: 18000,
      maksimumHacimM3: 45,
      kasaTipi: "TENTELI",
    });

    expect(transactionClientMock.arac.create).toHaveBeenCalled();
    expect(rolesServiceMock.assignRoleToUserInTransaction).toHaveBeenCalledWith(
      transactionClientMock,
      customerUser.id,
      ROLE_NAMES.NAKLIYECI
    );
    expect(response.user?.roles).toEqual([ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI]);
  });

  it("rejects duplicate email registration before user creation starts", async () => {
    usersServiceMock.existsByMail.mockResolvedValue(true);

    await expect(
      service.register({
        ad: "Aykut",
        soyad: "Test",
        mail: "aykut@example.com",
        kullaniciAdi: "aykut",
        password: "password123",
        role: ROLE_NAMES.MUSTERI,
      })
    ).rejects.toThrow(new ConflictException("Mail zaten kullanımda."));

    expect(prismaMock.client.$transaction).not.toHaveBeenCalled();
  });

  it("completes carrier onboarding by creating the first vehicle and issuing fresh tokens", async () => {
    usersServiceMock.findActiveById
      .mockResolvedValueOnce(customerUser)
      .mockResolvedValueOnce(dualRoleUser);
    jwtServiceMock.signAsync
      .mockResolvedValueOnce("next-access-token")
      .mockResolvedValueOnce("next-refresh-token");

    const response = await service.completeCarrierOnboarding(
      {
        id: customerUser.id,
        publicId: customerUser.publicId,
        mail: customerUser.mail,
        kullaniciAdi: customerUser.kullaniciAdi,
        roles: [ROLE_NAMES.MUSTERI],
      },
      {
        marka: "Ford",
        model: "Transit",
        plaka: "34 XYZ 987",
        yil: 2022,
        maksimumAgirlikKg: 14000,
        maksimumHacimM3: 32,
        kasaTipi: "PANELVAN",
      }
    );

    expect(transactionClientMock.arac.create).toHaveBeenCalled();
    expect(rolesServiceMock.assignRoleToUserInTransaction).toHaveBeenCalledWith(
      transactionClientMock,
      customerUser.id,
      ROLE_NAMES.NAKLIYECI
    );
    expect(response).toEqual({
      accessToken: "next-access-token",
      refreshToken: "next-refresh-token",
      tokenType: "Bearer",
      user: expect.objectContaining({
        roles: [ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI],
      }),
    });
  });

  it("does not grant NAKLIYECI when first-vehicle onboarding fails", async () => {
    usersServiceMock.findActiveById.mockResolvedValue(customerUser);
    transactionClientMock.arac.create.mockRejectedValue(createUniquePlateError());

    await expect(
      service.completeCarrierOnboarding(
        {
          id: customerUser.id,
          publicId: customerUser.publicId,
          mail: customerUser.mail,
          kullaniciAdi: customerUser.kullaniciAdi,
          roles: [ROLE_NAMES.MUSTERI],
        },
        {
          marka: "Ford",
          model: "Transit",
          plaka: "34 XYZ 987",
          yil: 2022,
          maksimumAgirlikKg: 14000,
          maksimumHacimM3: 32,
          kasaTipi: "PANELVAN",
        }
      )
    ).rejects.toThrow(new ConflictException("Plaka zaten kullanımda."));

    expect(rolesServiceMock.assignRoleToUserInTransaction).not.toHaveBeenCalled();
  });

  it("dismisses the requested dashboard intro and returns the updated user profile", async () => {
    const customerIntroDismissedAt = new Date("2026-05-05T10:00:00.000Z");

    usersServiceMock.dismissDashboardIntro.mockResolvedValue({
      id: customerUser.publicId,
      ad: customerUser.ad,
      soyad: customerUser.soyad,
      mail: customerUser.mail,
      kullaniciAdi: customerUser.kullaniciAdi,
      telefonNumarasi: customerUser.telefonNumarasi,
      customerIntroDismissedAt,
      carrierIntroDismissedAt: null,
      roles: [ROLE_NAMES.MUSTERI],
      businessRoles: [ROLE_NAMES.MUSTERI],
      isAdmin: false,
    });

    const response = await service.dismissDashboardIntro(
      {
        id: customerUser.id,
        publicId: customerUser.publicId,
        mail: customerUser.mail,
        kullaniciAdi: customerUser.kullaniciAdi,
        roles: [ROLE_NAMES.MUSTERI],
      },
      "customer"
    );

    expect(usersServiceMock.dismissDashboardIntro).toHaveBeenCalledWith(
      customerUser.id,
      "customer"
    );
    expect(response).toEqual(
      expect.objectContaining({
        customerIntroDismissedAt,
        carrierIntroDismissedAt: null,
      })
    );
  });
});
