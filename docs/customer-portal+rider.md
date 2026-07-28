## Rinsion – Order Request, Pickup & Delivery Workflow

## Overview

Rinsion should provide an end-to-end order management workflow that allows customers to create laundry orders, request pickups, and receive completed orders through integrated ride-hailing or delivery partners. The platform should give laundries complete operational control while eliminating the need for manual phone calls to coordinate logistics.

The rider service acts as a logistics partner rather than replacing the laundry's decision-making. Every pickup and delivery request should originate from, or be approved by, the laundry.

---

# Objectives

- Allow customers to create laundry orders remotely.
- Automatically calculate pricing based on selected laundry items.
- Generate an invoice before pickup.
- Allow customers to request pickups digitally.
- Give laundries full control over approving pickup requests.
- Integrate with third-party rider services for pickups and deliveries.
- Eliminate manual coordination through phone calls.
- Capture logistics data to improve operations over time.

---

# Customer Order Flow

## 1. Customer Creates an Order

The customer opens the customer portal and creates a new laundry order.

The customer:

- Selects the laundry.
- Enters the laundry items.
- Specifies quantities where applicable.
- Adds any notes or special instructions.

The system automatically calculates the estimated price based on the laundry's pricing configuration.

---

## 2. Invoice Generation

Once the customer completes the order, Rinsion generates an invoice showing:

- Order ID
- Customer information
- Laundry information
- Itemized list
- Quantity of each item
- Estimated price
- Date
- Pickup status
- Payment status (if applicable)

The invoice can be delivered through:

- Email
- SMS
- In-app view
- Future notification channels

---

## 3. Customer Requests Pickup

After reviewing the invoice, the customer presses **Request Pickup**.

**Important:**

The request does **not** go directly to the rider company.

Instead, it goes to the laundry's dashboard.

---

# Laundry Pickup Approval

The laundry receives a notification indicating that a customer has requested a pickup.

The laundry reviews:

- Customer details
- Items
- Estimated price
- Pickup address
- Operational capacity
- Any additional notes

The laundry then decides whether to:

- Approve the pickup
- Delay the pickup
- Reject the pickup (future enhancement)

This ensures that pickups occur only when the laundry is ready to receive them.

---

# Rider Assignment (Pickup)

Once the laundry approves the pickup request, Rinsion forwards the request to the integrated ride-hailing or delivery service.

The rider partner:

- Receives the pickup request.
- Assigns an available rider.
- The rider travels to the customer's location.
- Picks up the laundry.
- Delivers it to the laundry.

The laundry never needs to manually call a rider.

Everything is initiated through the dashboard.

---

# Laundry Processing

Once the laundry receives the clothes, the normal Rinsion workflow begins:

- Check-in
- Washing
- Drying
- Ironing
- Folding
- Packaging
- Ready for delivery

Operational tracking remains unchanged.

---

# Delivery Request

When the order reaches the **Ready** status, the laundry should have a **Request Delivery** button.

Selecting this button sends a delivery request to the integrated rider service.

The rider:

- Travels to the laundry.
- Collects the completed order.
- Delivers it to the customer.

Again, no manual phone calls should be required.

---

# Integration with Rider Services

Rinsion should support partnerships with ride-hailing or logistics providers.

Possible integrations include:

- Motorcycle delivery companies
- Ride-hailing platforms
- Courier services

The integration should allow Rinsion to:

- Create pickup requests
- Create delivery requests
- Receive rider assignment updates
- Receive delivery status updates
- Track completed deliveries

Implementation may require:

- Business partnerships
- API integrations
- Operational agreements with logistics providers

---

# Operational Control

A key design principle is that **the laundry remains in control**.

Customers can request pickups.

Only the laundry decides whether a pickup request is forwarded to a rider.

This prevents:

- Unexpected pickups
- Capacity overload
- Scheduling conflicts
- Riders arriving before the laundry is ready

The rider service is an execution partner—not the decision-maker.

---

# Future Analytics Opportunities

Because every pickup and delivery request passes through Rinsion, the platform can collect valuable operational insights.

Potential analytics include:

- Pickup hotspots (hostels, hotels, neighborhoods, offices, campuses, etc.)
- Delivery hotspots
- Peak pickup hours
- Peak delivery hours
- Average pickup response time
- Average delivery time
- Rider performance metrics
- Laundry fulfillment times
- Customer demand trends

These insights can help optimize logistics, improve rider allocation, and support business decisions for both Rinsion and participating laundries.

---

# Complete Workflow

1. Customer creates a laundry order.
2. System calculates pricing.
3. System generates an invoice.
4. Customer reviews the invoice.
5. Customer clicks **Request Pickup**.
6. Pickup request is sent to the laundry dashboard.
7. Laundry reviews the request.
8. Laundry approves the pickup.
9. Rinsion sends the pickup request to the rider service.
10. Rider picks up the laundry.
11. Rider delivers it to the laundry.
12. Laundry processes the order.
13. Laundry marks the order as **Ready**.
14. Laundry clicks **Request Delivery**.
15. Rinsion sends a delivery request to the rider service.
16. Rider collects the completed order.
17. Rider delivers the order to the customer.
18. Order is marked as completed.

## Architecture Recommendation: Logistics Provider Abstraction Layer

Rinsion should **not integrate its core order management system directly with a single ride-hailing or delivery company**.

Instead, introduce a **Logistics Provider Layer** (also called a Logistics Gateway or Logistics Adapter) between Rinsion and external logistics providers.

### Architecture

```
Customer
     │
     ▼
Rinsion Customer Portal
     │
     ▼
Laundry Dashboard
     │
     ▼
Logistics Provider Layer
     ├── Rider Company A
     ├── Rider Company B
     ├── Courier Company C
     └── Future Providers
```

The Laundry Dashboard communicates only with the Logistics Provider Layer. The Logistics Provider Layer is responsible for communicating with each external logistics partner using their respective APIs.

### Standard Logistics Operations

Every logistics provider should expose a common set of operations, regardless of which company actually fulfills the request:

- Create Pickup Request
- Cancel Pickup Request
- Create Delivery Request
- Cancel Delivery Request
- Get Rider Assignment
- Track Pickup Status
- Track Delivery Status
- Confirm Pickup
- Confirm Delivery
- Receive Webhook/Event Updates

Internally, the Laundry Dashboard should only call these standard operations. The Logistics Provider Layer translates those requests into the format required by each logistics partner.

### Benefits

- Support multiple ride-hailing and courier companies without changing the core product.
- Easily replace one provider if service quality declines.
- Expand into new cities or countries by adding new provider integrations instead of rewriting business logic.
- Allow laundries to choose their preferred logistics partner.
- Improve system maintainability by isolating third-party integrations from the rest of the application.
- Reduce the impact of API changes from external providers.

### Updated End-to-End Workflow

1. Customer creates a laundry order.
2. System calculates pricing.
3. System generates an invoice.
4. Customer reviews the invoice.
5. Customer clicks **Request Pickup**.
6. Pickup request is sent to the laundry dashboard.
7. Laundry reviews the request.
8. Laundry approves the pickup.
9. The Laundry Dashboard sends the request to the **Logistics Provider Layer**.
10. The Logistics Provider Layer selects and communicates with the appropriate logistics partner.
11. A rider is assigned.
12. Rider picks up the laundry.
13. Rider delivers it to the laundry.
14. Laundry processes the order.
15. Laundry marks the order as **Ready**.
16. Laundry clicks **Request Delivery**.
17. The request is sent to the **Logistics Provider Layer**.
18. The Logistics Provider Layer forwards the delivery request to the selected logistics partner.
19. A rider is assigned.
20. Rider collects the completed order.
21. Rider delivers the order to the customer.
22. The order is marked as completed.

### Design Principle

Rinsion owns the **order lifecycle**, while logistics providers own the **transportation lifecycle**. By keeping these responsibilities separate through the Logistics Provider Layer, Rinsion remains flexible, scalable, and independent of any single ride-hailing or delivery company.