import { Test } from "@nestjs/testing";
import { NotificationsPublisher } from "../src/modules/notifications/notifications.publisher";
import { NotificationsRepository } from "../src/modules/notifications/repositories/notifications.repository";

describe("NotificationsPublisher", () => {
  let publisher: NotificationsPublisher;
  let notificationsRepositoryMock: {
    createIfAbsent: jest.Mock;
  };

  beforeEach(async () => {
    notificationsRepositoryMock = {
      createIfAbsent: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsPublisher,
        {
          provide: NotificationsRepository,
          useValue: notificationsRepositoryMock,
        },
      ],
    }).compile();

    publisher = moduleRef.get(NotificationsPublisher);
  });

  it("suppresses self-recipient notifications", async () => {
    await publisher.publishThreadMessage({
      recipientUserId: 10,
      actorUserId: 10,
      messageId: 55,
      offerId: 77,
      requestId: 501,
    });

    expect(notificationsRepositoryMock.createIfAbsent).not.toHaveBeenCalled();
  });

  it("still writes notifications for real counterparty recipients", async () => {
    await publisher.publishThreadMessage({
      recipientUserId: 22,
      actorUserId: 10,
      messageId: 56,
      offerId: 77,
      requestId: 501,
    });

    expect(notificationsRepositoryMock.createIfAbsent).toHaveBeenCalledTimes(1);
  });
});
