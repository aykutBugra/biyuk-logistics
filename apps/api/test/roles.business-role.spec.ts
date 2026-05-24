import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  BUSINESS_ROLE_VALUES,
  ROLE_NAMES,
} from "../src/common/constants/role-names";
import { RolesRepository } from "../src/modules/roles/repositories/roles.repository";
import { RolesService } from "../src/modules/roles/roles.service";
import { UsersRepository } from "../src/modules/users/repositories/users.repository";

describe("RolesService.addBusinessRoleToUser", () => {
  let service: RolesService;
  let rolesRepositoryMock: {
    findByRoleName: jest.Mock;
    findRoleNamesByUserId: jest.Mock;
    createRoleAssignment: jest.Mock;
    createRoleAssignmentInTransaction: jest.Mock;
  };
  let usersRepositoryMock: {
    findActiveById: jest.Mock;
  };

  beforeEach(async () => {
    rolesRepositoryMock = {
      findByRoleName: jest.fn(),
      findRoleNamesByUserId: jest.fn(),
      createRoleAssignment: jest.fn(),
      createRoleAssignmentInTransaction: jest.fn(),
    };
    usersRepositoryMock = {
      findActiveById: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: RolesRepository,
          useValue: rolesRepositoryMock,
        },
        {
          provide: UsersRepository,
          useValue: usersRepositoryMock,
        },
      ],
    }).compile();

    service = moduleRef.get(RolesService);
  });

  it("allows adding MUSTERI to a legacy carrier-only user", async () => {
    usersRepositoryMock.findActiveById.mockResolvedValue({
      id: 10,
      ad: "Legacy",
      soyad: "Carrier",
      mail: "legacy@example.com",
      kullaniciAdi: "legacy",
      telefonNumarasi: null,
      sifreHash: "hash",
      roleNames: [ROLE_NAMES.NAKLIYECI],
    });
    rolesRepositoryMock.findByRoleName.mockResolvedValue({
      id: 1,
      rolAd: ROLE_NAMES.MUSTERI,
    });
    rolesRepositoryMock.findRoleNamesByUserId.mockResolvedValue([
      ROLE_NAMES.MUSTERI,
      ROLE_NAMES.NAKLIYECI,
    ]);

    const response = await service.addBusinessRoleToUser(10, ROLE_NAMES.MUSTERI);

    expect(rolesRepositoryMock.createRoleAssignment).toHaveBeenCalledWith(10, 1);
    expect(response).toEqual({
      roles: [ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI],
      businessRoles: [ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI],
      isAdmin: false,
    });
  });

  it("rejects self-serve NAKLIYECI assignment", async () => {
    await expect(
      service.addBusinessRoleToUser(10, ROLE_NAMES.NAKLIYECI)
    ).rejects.toThrow(
      new ConflictException("Nakliyeci rolu profil olusturma islemi sirasinda verilir.")
    );

    expect(usersRepositoryMock.findActiveById).not.toHaveBeenCalled();
    expect(rolesRepositoryMock.createRoleAssignment).not.toHaveBeenCalled();
  });

  it("rejects duplicate business role assignments", async () => {
    usersRepositoryMock.findActiveById.mockResolvedValue({
      id: 10,
      ad: "Dual",
      soyad: "User",
      mail: "dual@example.com",
      kullaniciAdi: "dual",
      telefonNumarasi: null,
      sifreHash: "hash",
      roleNames: [ROLE_NAMES.MUSTERI],
    });

    await expect(
      service.addBusinessRoleToUser(10, ROLE_NAMES.MUSTERI)
    ).rejects.toThrow(
      new ConflictException("Mevcut kullanici zaten bu is rolune sahip.")
    );
    expect(rolesRepositoryMock.createRoleAssignment).not.toHaveBeenCalled();
  });

  it("does not expose ADMIN in the self-serve business role allowlist", () => {
    expect(BUSINESS_ROLE_VALUES).toEqual([
      ROLE_NAMES.MUSTERI,
      ROLE_NAMES.NAKLIYECI,
    ]);
    expect(BUSINESS_ROLE_VALUES).not.toContain(ROLE_NAMES.ADMIN);
  });
});
