import { db } from '../db/index.js';
import { notificationLogs } from '../db/schema.js';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'internal';

export type NotificationEvent =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'order_cancelled'
  | 'payment_successful'
  | 'payment_failed'
  | 'low_stock_alert';

export interface NotificationProvider {
  channel: NotificationChannel;
  dispatch(recipient: string, subject: string, payload: Record<string, unknown>): Promise<boolean>;
}

/**
 * Default pluggable stub provider. Production deployments can register
 * Nodemailer/Resend (email), SSLWireless/Twilio (SMS), or Meta Cloud API (WhatsApp).
 */
class QueueLogNotificationProvider implements NotificationProvider {
  constructor(public readonly channel: NotificationChannel) { }

  async dispatch(
    _recipient: string,
    _subject: string,
    _payload: Record<string, unknown>
  ): Promise<boolean> {
    return true;
  }
}

const providers: Record<NotificationChannel, NotificationProvider> = {
  email: new QueueLogNotificationProvider('email'),
  sms: new QueueLogNotificationProvider('sms'),
  whatsapp: new QueueLogNotificationProvider('whatsapp'),
  push: new QueueLogNotificationProvider('push'),
  internal: new QueueLogNotificationProvider('internal'),
};

export async function dispatchNotification(params: {
  channel: NotificationChannel;
  event: NotificationEvent;
  recipient: string;
  subject: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const provider = providers[params.channel];
    const ok = await provider.dispatch(params.recipient, params.subject, params.payload);
    await db.insert(notificationLogs).values({
      channel: params.channel,
      event: params.event,
      recipient: params.recipient,
      subject: params.subject,
      payload: params.payload,
      status: ok ? 'queued' : 'failed',
    });
  } catch (err) {
    console.error('[Notification Error]', err);
  }
}

