# ECPay Logistics Spec

> 介接密鑰、測試／正式端點、C2C 金鑰、AES V2、官方文件連結 → [ecpay-integration-handbook.md](./ecpay-integration-handbook.md)

## Purpose

Integrate ECPay logistics into the subscription order flow.

This logistics flow is popup-based:

- logistics selection is completed in an external popup window
- the main app remains in the subscription journey
- after selection, the popup returns control to the main app

This system must support both:

- convenience store pickup
- home delivery

---

## Core Logistics Model

Shipping must always be represented by two levels:

### logistics_type

Allowed values:

- `CVS`
- `HOME`

Meaning:

- `CVS` = convenience store pickup
- `HOME` = home delivery

### logistics_subtype

Detailed logistics subtype.

Typical CVS subtypes:

- `UNIMARTC2C`
- `FAMIC2C`
- `HILIFEC2C`
- `OKMARTC2C`
- `UNIMARTFREEZE`

Typical HOME subtypes:

- `TCAT`
- `POST`

Important:

- do not flatten logistics into a single generic “shipping method”
- `logistics_type` determines the main UI and process branch
- `logistics_subtype` determines detailed display and provider behavior

---

## High-Level Logistics Flow（NutriPilot V1 多廠商）

1. User completes recipient info and per-vendor shipping method in cart
2. `create-shop-order` builds `checkout_snapshot.logisticsByVendor`
3. Per vendor popup: CVS → `Express/map` (ServerReply `ecpay-logistics-map-return`); HOME → mark address ready
4. `seven_eleven_cod`: Create on map return (`IsCollection=Y`); other CVS/HOME: Create after payment in `ecpay-return`
5. All vendors ready → ECPay AIO payment (`paymentTotal` excludes COD goods subtotal)
6. `ecpay-return` creates pending logistics + `sub_orders`; `ecpay-logistics-return` receives status updates

---

## Entry Route

### Logistics Selection Entry

`GET /api/admin/logistics/ecpay/selection?orderId=...&logisticsType=...&method=...&goodsAmount=...`

Purpose:

- prepare logistics selection request
- send encrypted payload to ECPay logistics selection endpoint
- return HTML/response that continues logistics flow in popup

This route is intended to be opened in a popup window.

---

## Input Parameters

Expected inputs:

- `orderId`
- `logisticsType`
- `method`
- `goodsAmount`

Rules:

- normalize `logisticsType`
- normalize `method` according to `logisticsType`
- clamp or validate `goodsAmount` within supported bounds

---

## Required Order Data

Before logistics starts, order should already contain:

- recipient name
- recipient phone
- enough order context for goods amount and goods description

For some flows, sender profile must also be configured.

---

## Sender Configuration

Expected environment/config values:

- logistics merchant id
- logistics hash key
- logistics hash iv
- sender name
- sender phone / cellphone
- sender zip code
- sender address
- `APP_URL`

If sender profile is incomplete, logistics flow should fail early.

---

## ECPay Logistics Envelope Model

Selection/create/query in logistics V2 should use:

- `MerchantID`
- `RqHeader.Timestamp`
- encrypted `Data`

Data should be:

- JSON serialized
- URL encoded as required
- encrypted with AES
- base64 encoded

Implementation should use one shared helper for:

- encryption
- decryption
- request posting
- response parsing

---

## Selection Request Purpose

The selection request is the user-facing logistics step.

It should contain enough data for:

- logistics type
- logistics subtype
- goods amount
- sender info
- receiver info
- callback URLs

Typical fields include:

- `TempLogisticsID`
- `GoodsAmount`
- `GoodsName`
- `SenderName`
- `SenderAddress`
- `SenderCellPhone`
- `ReceiverName`
- `ReceiverPhone`
- `ReceiverCellPhone`
- `LogisticsType`
- `LogisticsSubType`
- `ServerReplyURL`
- `ClientReplyURL`

---

## Callback Design

### Client Return

Route:
`POST /api/admin/logistics/ecpay/client-return?orderId=...`

Purpose:

- handle popup/browser return after user finishes ECPay logistics interaction
- extract temporary logistics selection result
- create final logistics transaction from temp selection
- query logistics result
- persist normalized shipping data
- redirect popup back into the main app flow

This route is for popup/browser continuation.

### Server Return

Route:
`POST /api/logistics/ecpay/return`

Purpose:

- handle server-side logistics callback updates
- update shipment/tracking/delivery status
- persist callback metadata
- acknowledge ECPay correctly

This route is for logistics state updates after creation.

---

## Client Return Processing Rules

The client return handler should:

1. parse incoming payload
2. extract temporary logistics result
3. persist temp selection metadata
4. create a final logistics trade from temp selection
5. query logistics trade result
6. normalize data into internal shipping fields
7. update order
8. update subscription delivery metadata
9. redirect popup back into main app

---

## Internal Shipping Data Rules

### If logistics_type = CVS

Write order data such as:

- `shipping_carrier = ecpay_cvs`
- `shipping_method = subtype-derived value`
- `recipient_name`
- `recipient_phone`
- `cvs_store_id`
- `cvs_store_name`
- `cvs_store_address`
- `shipping_address` if store address is used
- logistics metadata payloads

Update subscription metadata with something like:

- delivery type = `cvs_pickup`
- cvs subtype
- cvs store fields

### If logistics_type = HOME

Write order data such as:

- `shipping_carrier = tcat | post | ecpay_home`
- `shipping_method = home_delivery`
- `recipient_name`
- `recipient_phone`
- `shipping_address`
- clear CVS-specific fields
- logistics metadata payloads

Update subscription metadata with something like:

- delivery type = `home_delivery`
- home subtype
- carrier subtype
- address

---

## Main Logistics Branches

### CVS branch

User task:

- choose convenience store location

Completion requirements:

- store id
- store name
- store address
- recipient data
- logistics type/subtype

UI meaning:

- convenience store pickup

### HOME branch

User task:

- confirm home delivery details

Completion requirements:

- shipping address
- recipient data
- logistics type/subtype

UI meaning:

- home delivery

---

## Popup Return UX

The logistics popup should:

- redirect the opener/main window back into the app flow
- close itself if possible
- fall back to same-window redirect if no opener exists

The main app should:

- remain in the flow
- avoid confusing re-entry loops
- support a “waiting for popup” state

---

## Re-entry / Loop Prevention

After logistics popup returns, the main app should not immediately redirect back into logistics again.

A temporary query flag or equivalent mechanism may be used to indicate:

- logistics selection has just completed
- popup has already returned
- page should continue normal flow

This should be cleaned up after use when appropriate.

---

## Server Callback Status Updates

Server callback should update order shipment state based on ECPay callback status codes.

Typical updates may include:

- shipped
- delivered
- returned

It should also persist:

- shipment no
- tracking number
- callback payload
- callback timestamp

---

## Metadata Persistence

Recommended metadata areas:

- temp selection payload
- create result payload
- query result payload
- server callback payload
- logistics merchant trade no

Purpose:

- debugging
- auditability
- print support
- support workflow recovery

---

## Printing Support

For CVS flows, some subtypes may support logistics slip printing.

Printing flow should:

- read logistics identifiers from persisted metadata
- generate required print fields
- post to ECPay print endpoint
- be exposed in admin order detail if data is complete

---

## Display Name Rules

Internal subtype values should not be shown directly to users.

Use mapped labels such as:

- `UNIMARTC2C` -> `7-ELEVEN`
- `FAMIC2C` -> `FamilyMart`
- `HILIFEC2C` -> `Hi-Life`
- `OKMARTC2C` -> `OK Mart`
- `TCAT` -> `Black Cat`
- `POST` -> `Post`

Important:

- the same mapping should be used across:
  - frontstage
  - backstage
  - emails
  - order summary
  - notifications

---

## Alignment Rules

Logistics data and wording must remain aligned across:

- frontstage confirmation pages
- payment result related summaries
- admin order detail
- admin shipment operations
- email notifications
- callback handlers
- internal data model

If one layer uses `logistics_type` + `logistics_subtype`, all layers should respect that model.

---

## Implementation Guidance

- centralize logistics normalization logic
- centralize display label mapping
- separate client-return responsibilities from server-return responsibilities
- preserve popup-based logistics flow
- support both CVS and HOME from the same domain model
- do not introduce a flat, ambiguous shipping method model
