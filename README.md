
# FamilyWall API Client

A TypeScript client for interacting with the FamilyWall API.

Forked from [CodingButter/familywall-api](https://github.com/CodingButter/familywall-api).

## Installation

```bash
npm install familywall-api
```

## Usage

```typescript
import { FamilyWallClient } from "familywall-api";

const client = new FamilyWallClient({ timezone: "Europe/London" });
await client.login("email@example.com", "yourpassword");

const family = await client.getFamily();
const members = family.getMembers();
console.log(members);
```

## API

### `FamilyWallClient`

The main client class for authenticating and interacting with the FamilyWall API.

#### Constructor

```typescript
import { FamilyWallClient } from "familywall-api";

const client = new FamilyWallClient({ timezone: "Europe/London" });
```

- `options` (optional): an object that allows you to specify a `timezone`. Defaults to the system timezone.

#### Methods

- **login(email, password)** - Log in to the FamilyWall API. Automatically handles session and cookies.
- **getWebSocketUrl()** - Retrieve the WebSocket URL for live updates.
- **getAllFamily()** - Fetch all family-related data, including members, profiles, and settings.
- **getFamily()** - Returns a `Family` instance populated with family data.

---

### `Family`

Returned by `client.getFamily()`. Provides methods to access and manage family data.

#### Methods

- **getMembers()** - Get all family members.
- **getMember(firstName)** - Get a specific member by first name.
- **getMemberProfile(accountId)** - Get a member's detailed profile.
- **getFamilySettings()** - Get family settings.
- **getFamilyMedia()** - Get family cover media.
- **getMessages()** - Get messaging threads.
- **getPremiumAccountDetails()** - Get premium account details.
- **getCalendarEvents()** - List all events on the family calendar.
- **createCalendarEvent(event)** - Create an event on the family calendar.
- **deleteCalendarEvent(eventId)** - Delete an event from the family calendar.
- **updateCalendarEvent(eventId, event)** - Update an event on the family calendar.
- **getLists(options?)** - Retrieve family list summaries. Pass `{ type: "shopping" }`, `{ type: "todo" }`, or `{ type: "other" }` to filter locally.
- **getList(listId)** - Retrieve one list and its items.
- **createList(input)** - Create a shopping, todo, or other list and return its server-assigned identifier.

#### Calendar Example

```typescript
import { FamilyWallClient } from "familywall-api";

const client = new FamilyWallClient();
await client.login("email@example.com", "yourpassword");

const family = await client.getFamily();

// List events
const events = await family.getCalendarEvents();
console.log(events);

// Create an event
const newEvent = await family.createCalendarEvent({
  text: "Dentist Appointment",
  startDate: "2026-03-01T10:00:00",
  endDate: "2026-03-01T11:00:00",
  color: "#FF5733",
  where: "123 Main St",
  description: "Annual checkup",
});

// Update an event
await family.updateCalendarEvent(newEvent.eventId, {
  ...newEvent,
  text: "Dentist Appointment (rescheduled)",
});

// Delete an event
await family.deleteCalendarEvent(newEvent.eventId);
```

#### Lists Example

```typescript
const lists = await family.getLists();
const shoppingLists = await family.getLists({ type: "shopping" });

const newList = await family.createList({
  name: "Weekly groceries",
  type: "shopping",
});

const list = await family.getList(newList.id);
console.log(list.items);
```

List collection responses contain summaries. `getList` returns the list's items when the server provides them. The supported creation types are `shopping`, `todo`, and `other`; unknown types returned by FamilyWall are preserved as returned. List names must contain at least one non-whitespace character, and list methods throw `FamilyWallApiError` for HTTP failures, API errors, invalid JSON, or malformed responses.

---

## Types

All types are exported from the package:

```typescript
import type {
  Member,
  FamilySettings,
  CalendarEvent,
  CreateEventRequest,
  PremiumDetails,
  ListSummary,
  ListDetails,
  CreateListRequest,
  // ... and more
} from "familywall-api";
```

---

## License

This project is licensed under the MIT License.
