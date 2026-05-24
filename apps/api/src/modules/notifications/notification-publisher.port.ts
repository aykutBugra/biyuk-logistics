export type NotificationRouteContext = {
  baslangicSehri: string;
  varisSehri: string;
};

export interface NotificationPublisherPort {
  publishIncomingOffer(input: {
    customerId: number;
    offerId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
  }): Promise<void>;

  publishOfferAccepted(input: {
    carrierId: number;
    offerId: string;
    requestId: string;
    jobId: string;
    actorUserId?: number;
  }): Promise<void>;

  publishOfferRejected(input: {
    carrierId: number;
    offerId: string;
    requestId: string;
    actorUserId?: number;
  }): Promise<void>;

  publishThreadMessage(input: {
    recipientUserId: number;
    messageId: string;
    offerId: string;
    requestId: string;
    actorUserId?: number;
  }): Promise<void>;

  publishCounterOffer(input: {
    recipientUserId: number;
    messageId: string;
    offerId: string;
    requestId: string;
    fiyat: number;
    actorUserId?: number;
  }): Promise<void>;

  publishJobStarted(input: {
    customerId: number;
    jobId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
  }): Promise<void>;

  publishJobCompleted(input: {
    customerId: number;
    jobId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
  }): Promise<void>;

  publishDeliveryConfirmationRequested(input: {
    customerId: number;
    jobId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
  }): Promise<void>;

  publishJobCompletedForCarrier(input: {
    carrierId: number;
    jobId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
  }): Promise<void>;

  publishRatingReceived(input: {
    ratedUserId: number;
    ratingId: string;
    jobId: string;
    puanDegeri: number;
    actorUserId?: number;
  }): Promise<void>;

  publishRatingPending(input: {
    userId: number;
    jobId: string;
    actorUserId?: number;
  }): Promise<void>;
}
