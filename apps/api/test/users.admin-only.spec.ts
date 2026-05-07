import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import * as request from "supertest";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import type { AuthenticatedUser } from "../src/common/types/authenticated-user.type";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { RolesGuard } from "../src/common/guards/roles.guard";
import { UsersController } from "../src/modules/users/users.controller";
import { UsersService } from "../src/modules/users/users.service";

describe("UsersController admin guard", () => {
  let app: INestApplication;
  let currentUser: AuthenticatedUser = {
    id: 10,
    mail: "user@example.com",
    kullaniciAdi: "user",
    roles: [ROLE_NAMES.MUSTERI],
  };

  const usersServiceMock = {
    getAllActiveProfiles: jest.fn().mockResolvedValue([]),
  };
  const jwtAuthGuardMock = {
    canActivate: (context: {
      switchToHttp: () => { getRequest: () => Record<string, unknown> };
    }) => {
      context.switchToHttp().getRequest().user = currentUser;
      return true;
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        Reflector,
        RolesGuard,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtAuthGuardMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    usersServiceMock.getAllActiveProfiles.mockClear();
  });

  it("returns 403 for authenticated non-admin users", async () => {
    currentUser = {
      id: 10,
      mail: "user@example.com",
      kullaniciAdi: "user",
      roles: [ROLE_NAMES.MUSTERI],
    };

    await request(app.getHttpServer()).get("/users").expect(403);
    expect(usersServiceMock.getAllActiveProfiles).not.toHaveBeenCalled();
  });

  it("allows admins to access the directory endpoint", async () => {
    currentUser = {
      id: 1,
      mail: "admin@example.com",
      kullaniciAdi: "admin",
      roles: [ROLE_NAMES.ADMIN],
    };

    await request(app.getHttpServer()).get("/users").expect(200, []);
    expect(usersServiceMock.getAllActiveProfiles).toHaveBeenCalledTimes(1);
  });
});
