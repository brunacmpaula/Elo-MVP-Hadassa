export type NotificationRecipient = {
  id: string;
  gender: "FEMALE" | "MALE";
};

export type NotificationPreferences = {
  womenOnlyNotifications: boolean;
};

export type NotificationDelivery = {
  id: string;
  recipientId: string;
  missionaryId: string;
  postId: string;
  queuedAt: string;
};

const notificationOutbox: NotificationDelivery[] = [];

/**
 * Apply the missionary's audience preference at the point where recipients
 * are selected. Keeping this rule in the service prevents callers from
 * accidentally notifying male recipients when the preference is enabled.
 */
export function selectNotificationRecipients(
  recipients: NotificationRecipient[],
  preferences: NotificationPreferences,
) {
  if (!preferences.womenOnlyNotifications) return recipients;
  return recipients.filter((recipient) => recipient.gender === "FEMALE");
}

export function dispatchMissionaryNotification(input: {
  missionaryId: string;
  postId: string;
  recipients: NotificationRecipient[];
  preferences: NotificationPreferences;
}) {
  const selectedRecipients = selectNotificationRecipients(
    input.recipients,
    input.preferences,
  );
  const queuedAt = new Date().toISOString();
  const deliveries = selectedRecipients.map((recipient) => ({
    id: `${input.postId}:${recipient.id}`,
    recipientId: recipient.id,
    missionaryId: input.missionaryId,
    postId: input.postId,
    queuedAt,
  }));
  notificationOutbox.push(...deliveries);
  return deliveries;
}

export function getQueuedNotificationDeliveries() {
  return [...notificationOutbox];
}