import {
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { UsersService } from "../src/modules/users/users.service";
import {
  type DeleteStoredUserAccountResult,
  UsersRepository,
} from "../src/modules/users/repositories/users.repository";

type FakeAccountState = {
  user: {
    id: number;
    mail: string;
    kullaniciAdi: string;
    telefonNumarasi: string | null;
    silmeTarihi: Date | null;
  };
  vehicles: Array<{
    sahipId: number;
    silmeTarihi: Date | null;
  }>;
  routes: Array<{
    nakliyeciId: number;
    silmeTarihi: Date | null;
  }>;
  requests: Array<{
    musteriId: number;
    silmeTarihi: Date | null;
  }>;
  block: {
    activeCarrierShipment?: boolean;
    activeCustomerShipment?: boolean;
    openCarrierOffer?: boolean;
    staleAcceptedOffer?: boolean;
    staleAgreedRequest?: boolean;
  };
  failOn?: "vehicle" | "route" | "request" | "user";
};

function createInitialState(overrides: Partial<FakeAccountState> = {}): FakeAccountState {
  return {
    user: {
      id: 77,
      mail: "user@example.com",
      kullaniciAdi: "carrier-user",
      telefonNumarasi: "+90 555 000 0000",
      silmeTarihi: null,
    },
    vehicles: [
      {
        sahipId: 77,
        silmeTarihi: null,
      },
    ],
    routes: [
      {
        nakliyeciId: 77,
        silmeTarihi: null,
      },
    ],
    requests: [
      {
        musteriId: 77,
        silmeTarihi: null,
      },
    ],
    block: {},
    ...overrides,
  };
}

function createPrismaServiceMock(initialState: FakeAccountState) {
  let state = structuredClone(initialState);

  const tx = {
    kullanici: {
      findFirst: jest.fn(async ({ where }: { where: { id: number } }) => {
        if (where.id !== state.user.id || state.user.silmeTarihi !== null) {
          return null;
        }

        const blockingRequests = state.block.activeCustomerShipment
          ? [
              {
                id: 601,
                durum: {
                  durumTuru: "ISTEK",
                  durumAdi: "OLUSTURULDU",
                },
                nakliye: {
                  id: 701,
                  durum: {
                    durumTuru: "NAKLIYE",
                    durumAdi: "BASLATILDI",
                  },
                },
              },
            ]
          : state.block.staleAgreedRequest
            ? [
                {
                  id: 602,
                  durum: {
                    durumTuru: "ISTEK",
                    durumAdi: "ANLASILDI",
                  },
                  nakliye: null,
                },
              ]
            : [];

        const blockingOffers = state.block.openCarrierOffer
          ? [
              {
                id: 801,
                durum: {
                  durumTuru: "TEKLIF",
                  durumAdi: "OLUSTURULDU",
                },
                istek: {
                  silmeTarihi: null,
                  nakliye: null,
                },
              },
            ]
          : state.block.staleAcceptedOffer
            ? [
                {
                  id: 802,
                  durum: {
                    durumTuru: "TEKLIF",
                    durumAdi: "KABUL_EDILDI",
                  },
                  istek: {
                    silmeTarihi: null,
                    nakliye: null,
                  },
                },
              ]
            : [];

        return {
          id: state.user.id,
          nakliyeler: state.block.activeCarrierShipment ? [{ id: 501 }] : [],
          istekler: blockingRequests,
          teklifler: blockingOffers,
        };
      }),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: number };
          data: {
            silmeTarihi: Date;
            mail: string;
            kullaniciAdi: string;
            telefonNumarasi: string | null;
          };
        }) => {
          if (state.failOn === "user") {
            throw new Error("user update failed");
          }

          if (where.id !== state.user.id || state.user.silmeTarihi !== null) {
            return { count: 0 };
          }

          state.user = {
            ...state.user,
            silmeTarihi: data.silmeTarihi,
            mail: data.mail,
            kullaniciAdi: data.kullaniciAdi,
            telefonNumarasi: data.telefonNumarasi,
          };

          return { count: 1 };
        }
      ),
    },
    arac: {
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { sahipId: number };
          data: { silmeTarihi: Date };
        }) => {
          if (state.failOn === "vehicle") {
            throw new Error("vehicle update failed");
          }

          let count = 0;

          state.vehicles = state.vehicles.map((vehicle) => {
            if (vehicle.sahipId !== where.sahipId || vehicle.silmeTarihi !== null) {
              return vehicle;
            }

            count += 1;
            return {
              ...vehicle,
              silmeTarihi: data.silmeTarihi,
            };
          });

          return { count };
        }
      ),
    },
    carrierRoute: {
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { nakliyeciId: number };
          data: { silmeTarihi: Date };
        }) => {
          if (state.failOn === "route") {
            throw new Error("route update failed");
          }

          let count = 0;

          state.routes = state.routes.map((route) => {
            if (route.nakliyeciId !== where.nakliyeciId || route.silmeTarihi !== null) {
              return route;
            }

            count += 1;
            return {
              ...route,
              silmeTarihi: data.silmeTarihi,
            };
          });

          return { count };
        }
      ),
    },
    istek: {
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { musteriId: number };
          data: { silmeTarihi: Date };
        }) => {
          if (state.failOn === "request") {
            throw new Error("request update failed");
          }

          let count = 0;

          state.requests = state.requests.map((request) => {
            if (request.musteriId !== where.musteriId || request.silmeTarihi !== null) {
              return request;
            }

            count += 1;
            return {
              ...request,
              silmeTarihi: data.silmeTarihi,
            };
          });

          return { count };
        }
      ),
    },
  };

  const prismaServiceMock = {
    client: {
      $transaction: jest.fn(async (callback: (executor: typeof tx) => Promise<unknown>) => {
        const previousState = structuredClone(state);

        try {
          return await callback(tx);
        } catch (error) {
          state = previousState;
          throw error;
        }
      }),
    },
  };

  return {
    prismaServiceMock,
    getState: () => state,
  };
}

describe("UsersRepository.deleteAccountById", () => {
  it("soft deletes the account and anonymizes identifiers in one transaction", async () => {
    const { prismaServiceMock, getState } = createPrismaServiceMock(createInitialState());
    const repository = new UsersRepository(prismaServiceMock as never);

    const result = await repository.deleteAccountById(77);
    const state = getState();

    expect(result).toEqual({
      ok: true,
    });
    expect(prismaServiceMock.client.$transaction).toHaveBeenCalledTimes(1);
    expect(state.user.silmeTarihi).toBeInstanceOf(Date);
    expect(state.user.mail).not.toBe("user@example.com");
    expect(state.user.mail.endsWith("@deleted.local")).toBe(true);
    expect(state.user.kullaniciAdi).not.toBe("carrier-user");
    expect(state.user.telefonNumarasi).toBeNull();
    expect(state.vehicles.every((vehicle) => vehicle.silmeTarihi instanceof Date)).toBe(
      true
    );
    expect(state.routes.every((route) => route.silmeTarihi instanceof Date)).toBe(true);
    expect(
      state.requests.every((request) => request.silmeTarihi instanceof Date)
    ).toBe(true);
  });

  it("blocks deletion when the user still has an active shipment", async () => {
    const { prismaServiceMock, getState } = createPrismaServiceMock(
      createInitialState({
        block: {
          activeCarrierShipment: true,
        },
      })
    );
    const repository = new UsersRepository(prismaServiceMock as never);

    const result = await repository.deleteAccountById(77);
    const state = getState();

    expect(result).toEqual({
      ok: false,
      reason: "ACTIVE_CARRIER_SHIPMENT",
    });
    expect(state.user.silmeTarihi).toBeNull();
    expect(state.user.mail).toBe("user@example.com");
  });

  it("blocks deletion when the user still has an active offer", async () => {
    const { prismaServiceMock, getState } = createPrismaServiceMock(
      createInitialState({
        block: {
          openCarrierOffer: true,
        },
      })
    );
    const repository = new UsersRepository(prismaServiceMock as never);

    const result = await repository.deleteAccountById(77);
    const state = getState();

    expect(result).toEqual({
      ok: false,
      reason: "OPEN_CARRIER_OFFER",
    });
    expect(state.user.silmeTarihi).toBeNull();
    expect(state.requests[0].silmeTarihi).toBeNull();
  });

  it("rolls back earlier mutations when a later step fails", async () => {
    const { prismaServiceMock, getState } = createPrismaServiceMock(
      createInitialState({
        failOn: "route",
      })
    );
    const repository = new UsersRepository(prismaServiceMock as never);

    await expect(repository.deleteAccountById(77)).rejects.toThrow("route update failed");

    const state = getState();

    expect(state.user.silmeTarihi).toBeNull();
    expect(state.user.mail).toBe("user@example.com");
    expect(state.vehicles[0].silmeTarihi).toBeNull();
    expect(state.routes[0].silmeTarihi).toBeNull();
    expect(state.requests[0].silmeTarihi).toBeNull();
  });
});

describe("UsersService.deleteOwnAccount", () => {
  function createService(result: DeleteStoredUserAccountResult) {
    const repository = {
      deleteAccountById: jest.fn().mockResolvedValue(result),
    };
    const service = new UsersService(repository as never, {} as never);

    return {
      service,
      repository,
    };
  }

  it("maps active shipment blocks to a conflict error", async () => {
    const { service } = createService({
      ok: false,
      reason: "ACTIVE_CARRIER_SHIPMENT",
    });

    await expect(service.deleteOwnAccount(77)).rejects.toThrow(
      new ConflictException("Account cannot be deleted while you have an active shipment.")
    );
  });

  it("maps missing users to unauthorized", async () => {
    const { service } = createService({
      ok: false,
      reason: "NOT_FOUND",
    });

    await expect(service.deleteOwnAccount(77)).rejects.toThrow(
      new UnauthorizedException("Current user could not be resolved.")
    );
  });
});
