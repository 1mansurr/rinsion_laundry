⏺ Clean build. 14 routes, zero errors. Here's what Phase 3 shipped:

  ---
  What's live now:

  ┌─────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────┐
  │        Route        │                                        What it does                                        │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /dashboard          │ Summary cards (today's orders, ready, processing, revenue) + recent orders + quick actions │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /items-and-services │ Item types tab, Services tab, interactive Pricing Matrix tab                               │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /customers          │ Customer list with last visit                                                              │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /customers/new      │ Create customer (returns existing if phone matches)                                        │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /customers/[id]     │ Customer detail with order history + lifetime revenue                                      │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /orders             │ Order list with status filters                                                             │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /orders/new         │ Full order creation form — customer search, branch, priority, dynamic line items, notes    │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /orders/[id]        │ Order detail — items, payment history, status history, actions panel                       │
  └─────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────┘
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /dashboard          │ Summary cards (today's orders, ready, processing, revenue) + recent orders + quick actions │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /items-and-services │ Item types tab, Services tab, interactive Pricing Matrix tab                               │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /customers          │ Customer list with last visit                                                              │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /customers/new      │ Create customer (returns existing if phone matches)                                        │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /customers/[id]     │ Customer detail with order history + lifetime revenue                                      │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /orders             │ Order list with status filters                                                             │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /orders/new         │ Full order creation form — customer search, branch, priority, dynamic line items, notes    │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
  │ /orders/[id]        │ Order detail — items, payment history, status history, actions panel                       │
  └─────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────┘

  The actions panel on every order lets you:
  - Record a payment (shows balance, supports Cash / MoMo / Card / Bank Transfer)
  - Move the order through its status lifecycle (Received → Confirmed → Processing → Ready → Collected)

  Start here:
  1. npm run dev and go to /items-and-services
  2. Add a few item types (Shirt, Trouser, Suit...) and services (Wash Only, Wash + Iron...)
  3. Set prices in the Pricing Matrix tab
  4. Go to /customers/new, create a test customer
  5. Go to /orders/new, search for the customer, add items, create the order