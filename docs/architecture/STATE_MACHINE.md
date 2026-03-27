# Order State Machine (Phase 1)

```
PENDING → CONFIRMED → PREPARING → READY → COMPLETED
   ↓           ↓           ↓         ↓
CANCELLED   CANCELLED   CANCELLED  CANCELLED
```

- Invalid transitions return 400 with reason.
- Every transition records an `OrderStatusEvent`.
- Transition to READY enqueues an SMS notification job.
- State machine logic lives in a service layer, not route handlers.
