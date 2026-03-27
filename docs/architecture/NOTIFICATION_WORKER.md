# Notification Worker (Outbox Pattern)

- Polls `NotificationJob` outbox every 10 seconds.
- Claims jobs by moving status to PROCESSING (with worker id / heartbeat if needed).
- Sends via Twilio Messaging Service.
- On success: marks SENT, sets `sent_at`.
- On failure: marks FAILED, stores `error_message`, increments `retry_count`.
- Template example for READY: “Your order #1003 from Joe’s Pizza is ready for pickup!”.
