# FamilyWall API method catalog

This is a reference list of the RPC methods the FamilyWall web app knows about, with their parameter names. It is meant as a map for future work: a method being listed here does **not** mean it is implemented in this package, or that its behaviour has been verified.

## Source

- Extracted on 2026-10-24 from the public web app bundle `https://www.familywall.com/generated/public/js/startupmodule.js` (build `2026-10-20T154210`). Each method is registered there as `qe("<method>", [<params>], <decoder>)`.
- Parameters shown as `{a, b, …}` are object parameters. The bundle encodes them through a dedicated encoder and sends their fields **flattened** into the form body, without a wrapper key. `…recurrence fields` stands for the shared recurrence encoder: `byDay`, `byMonthDay`, `endOccurence`, `exdate`, `rdate`, `recurrency`, `recurrencyEndDate`, `recurrencyInterval`, `rrule`.
- Parameter names are as they appear on the wire. The value encodings (dates, enums, IDs) are not part of this list.
- The bundle changes over time, so expect methods to be added or renamed.

## Transport notes

These notes match what `src/client.ts` already does, plus what the web app bundle shows:

- Every method is called as `POST https://api.familywall.com/api/<method>` with an `application/x-www-form-urlencoded` body that includes `partnerScope=Family`.
- The web app sends the first call's parameters unprefixed. It batches additional calls in the same request as `a01call=<method>`, `a01<param>=…`, `a02call=…`, and so on. This package uses the `a00…` / `a01call` form for its calls.
- Responses wrap each call as `{"a00": {"r": {"r": <result>}, "cn": "<method>"}}`, or `a00.ex` on error.
- Nested fields and list entries inside object parameters use dot notation, for example `reminderList.0.reminderValue`.
- The web app authenticates with an `Authorization` header whose value it keeps in `localStorage` after login (`Bearer <tokenId>:<secret>`), rather than a session cookie. The `log2generateaccesstokenbypassword` method appears to be the API-level way to obtain such a token. This package's cookie-based login is unaffected by this note.

## Methods

### Login and tokens

| Method | Parameters |
| --- | --- |
| `log2check` | `type`, `identifier`, `countryCode`, `validated` |
| `log2checkinvitation` | `type`, `identifier`, `countryCode` |
| `log2checkvalidationcode` | `type`, `identifier`, `countryCode`, `code` |
| `log2create` | `type`, `identifier`, `countryCode`, `password`, `partnerType`, `validationmethod`, `locale` |
| `log2deeplink` | `TK`, `fid` |
| `log2forgotpassword2` | `identifier` |
| `log2generateaccesstokeinbydeeplinktoken` | `token`, `tokentype`, `deviceId` |
| `log2generateaccesstokenbypassword` | `type`, `identifier`, `countryCode`, `password`, `tokentype`, `deviceId`, `clientId`, `clientSecret` |
| `log2get` | — |
| `log2getdeeplinkinfo` | `token`, `tokentype`, `deviceId` |
| `log2in` | `type`, `identifier`, `countryCode`, `password`, `generateAutologinToken`, `clientId`, `clientSecret` |
| `log2loginByAutologinToken` | `identifier`, `token` |
| `log2out` | — |
| `log2renew` | — |
| `log2sendaccountidentifiervalidationcode` | `type`, `identifier`, `countryCode` |
| `log2token` | `token` |
| `log2validateidentifier` | `type`, `identifier`, `countryCode`, `code`, `autoacceptpendinginvite` |

### Account and family

| Method | Parameters |
| --- | --- |
| `accaddidentifier` | `type`, `identifier`, `countryCode`, `validationmethod`, `password` |
| `accaddidentifier2` | `type`, `identifier`, `countryCode`, `validationmethod`, `password` |
| `accchangeaccountidentifier` | `oldid`, `type`, `countryCode`, `oldidentifier`, `newidentifier`, `validationmethod`, `password` |
| `accchangepassword` | `password`, `newpassword` |
| `acccheckpassword` | `password` |
| `acccreatefamily` | `name`, `role`, `customFamilyRole`, `cover` |
| `acccreatesubaccount` | `role`, `customFamilyRole`, `firstname`, `birthday`, `timezone`, `locale`, `picture`, `homeAddress`, `workAddress` |
| `accdeeplink` | `page`, `directWebPage` |
| `accgenerateDeepLoginLink` | `page`, `webWanted`, `dev` |
| `accgetallfamily` | `withStateBean` |
| `accgetfamily` | — |
| `accgetloggedaccount` | — |
| `accgetpremium` | — |
| `accgetsecuritystate` | — |
| `accgetstate` | `deviceId`, `modelType`, `applicationVersion`, `timezone`, `locale`, `buildTimestamp` |
| `accinvite` | `identifier`, `password`, `role`, `customFamilyRole`, `firstname`, `mobile`, `birthday`, `timezone`, `locale`, `picture`, `homeAddress`, `workAddress` |
| `accremoveidentifier` | `id`, `password` |
| `accremoveidentifier2` | `id`, `password` |
| `accsendaccountidentifiervalidationcode` | `id`, `type`, `identifier`, `countryCode`, `validationmethod` |
| `accsendwelcomeemail` | — |
| `accsetprofile` | `accountId`, `pseudo`, `firstname`, `gender`, `role`, `customFamilyRole`, `mobile`, `email`, `birthday`, `timezone`, `locale`, `picture`, `homeAddress`, `workAddress`, `color`, `publishProfileChanged`, `customFirstName`, `customAvatar` |
| `accsetterms` | `termsChecked`, `termsHtcChecked`, `termsOrangeFamilyPlaceChecked`, `termsSprintChecked`, `termsProximusFamilyChecked` |
| `accupdatefamily` | `name`, `file`, `cover` |
| `accvalidateaccountidentifierwithcode` | `id`, `type`, `identifier`, `countryCode`, `code`, `autoacceptpendinginvite` |
| `accvalidateaccountidentifierwithcode2` | `id`, `type`, `identifier`, `countryCode`, `code`, `autoacceptpendinginvite` |
| `accvalidatechangeaccountidentifier` | `oldid`, `type`, `countryCode`, `oldidentifier`, `newidentifier`, `code` |

### Family membership and invitations

| Method | Parameters |
| --- | --- |
| `famacceptinvitation` | `iid`, `v`, `validationmethod` |
| `famblockinvite` | `iid`, `v`, `block` |
| `famcancelinvite` | `invitationId`, `v` |
| `famgetinvitation` | `iid`, `v` |
| `famgetinvitationlinkbean` | — |
| `famlistfamily` | `withStateBean` |
| `famlistinvite` | `pg` |
| `famlogfamily` | `familyId` |
| `famresendinvite` | `iid`, `deviceComposerUsed` |
| `famsendinvite` | `email`, `phone`, `inviteeid`, `role`, `adminRight`, `customFamilyRole`, `firstname`, `picture`, `deviceComposerUsed`, `test` |
| `famsetfirst` | `familyId` |
| `famshowincominginvite` | `pg` |
| `famupdateinvitation` | `iid`, `email`, `phone`, `role`, `adminRight`, `customFamilyRole`, `firstname`, `picture` |

### Profiles

| Method | Parameters |
| --- | --- |
| `prfgetProfile` | `oid` |
| `prfgetProfiles` | — |
| `prfgetPublicProfiles` | `oid` |
| `prfupdate` | {accountId, addresses, birthDate, birthDateNoYear, color, devices, firstName, gender, isAccountDeleted, lastName, locale, metaId, pictureDefault, profileFamilyId, timeZone}, `picture` |
| `prfupdate2` | `role`, `customFamilyRole`, {accountId, addresses, birthDate, birthDateNoYear, color, devices, firstName, gender, isAccountDeleted, lastName, locale, metaId, pictureDefault, profileFamilyId, timeZone}, `picture` |

### Admin rights

| Method | Parameters |
| --- | --- |
| `adminchange` | `right`, `accountid` |
| `admindelete2` | `deleteAuthoredPost` |
| `admingetright` | `accountId` |
| `adminlist` | — |
| `adminremove` | `accountId`, `deleteAuthoredPost` |
| `adminwipefamily` | — |

### Settings

| Method | Parameters |
| --- | --- |
| `settingsaiinboxcheck` | `email` |
| `settingsaiinboxsave` | `email` |
| `settingsfeedback` | `type`, `score`, `comment` |
| `settingsget` | — |
| `settingsgetperfamily` | `familyId` |
| `settingsset` | `pushGlobal`, `pushForEvent`, `pushForMessage`, `pushForCheckin`, `pushForPicture`, `geoTrackingHistory`, `reminderNotificationEnabled`, `pushForTask`, `pushForStatus`, `pushForComment`, `pushForBestMoment`, `pushForTimetable`, `pushForBudget`, `pushForFiler`, `pushForSpecialDays`, `pushByEmail`, `promoAccept`, `pushForMealPlanner`, `pushForRecipe`, `pushForContact` |
| `settingssetperfamily` | {accountId, calendarFirstDayOfWeek, calendarWeekNb, dailyBriefHourOfDelivery, dailyBriefNothingPlannedActivated, dailyBriefPushActivated, defaultReminderType, defaultReminderUnit, defaultReminderValue, editable, familyId, geolocSharing, mealplannerFirstDayOfWeek, showDidYouKnow, showDishes, showSmartCard, specialdaysColorAnniversary, specialdaysColorBirthday, specialdaysColorCelebration, specialdaysFullname} |
| `settingsshutdowngeolocsharing` | — |

### Calendar and events

| Method | Parameters |
| --- | --- |
| `evtaddComment` | `eventId`, `text`, `mood` |
| `evtbatchupdate` | `metaId`, `input` |
| `evtcalcheckurl` | `url` |
| `evtcaldelete` | `metaId` |
| `evtcallist` | `withtask`, `withmeal`, `withfolder`, `withAllFamilies`, `withExternal`, `withOnError`, `withSpecialDays` |
| `evtcalsubscribe2` | `url` |
| `evtcalupdate` | {activated, color, errorCode, errorMessage, familyId, location, metaId, mine, name, referenceId, reminderActivated, rights, sharedByAccountId, sharedMemberIds, sharedToAll, subtitle, useEventColor} |
| `evtcreate` | {allDay, attendee, birthDateNoYear, calendarId, color, colorId, description, emoji, endDate, isToAll, metaId, picture, placeId, private, reminder, reminderList, startDate, taskListId, text, timeZone, type, where, …recurrence fields} |
| `evtdelete` | `option`, `eventId` |
| `evtdeleteoption` | `eventId` |
| `evtexternalimportdelete` | `deleteAttachedItems`, `id` |
| `evtget` | `eventId` |
| `evtgetbirthday` | `contactId` |
| `evticalimport` | `file`, `isPreview`, `indexes` |
| `evticalurl` | `calendarId`, `eventId` |
| `evticalvisibleurl` | `refresh`, `calendarId`, `eventId` |
| `evticalvisibleurldelete` | `calendarId` |
| `evtlistinterval` | `from`, `to`, `accountId`, `attendeeId` |
| `evtlistinterval2` | `from`, `to`, `accountId`, `attendeeId`, `calendarId`, `limit` |
| `evtlistintervalandcalendar` | `from`, `to`, `accountId`, `attendeeId`, `calendarId`, `activeCalendar`, `limit`, `activeTimetable` |
| `evtnavigate` | `eventId`, `offset`, `accountId` |
| `evtncsync` | `tokenValue`, `syncToken` |
| `evtsetexternalerror` | `error` |
| `evtsharedlink` | `timetableId`, `from`, `to` |
| `evtsync` | `syncToken`, `date`, `calendarId` |
| `evttimetableClose` | `timetableId` |
| `evttimetableCopySlice` | `timetableId`, `srcSliceNb`, `destSliceNb` |
| `evttimetableCopySliceByDate` | `timetableId`, `startDate`, `endDate`, `targetStart` |
| `evttimetableCopySliceWResult` | `timetableId`, `srcSliceNb`, `destSliceNb` |
| `evttimetableResetSlice` | `timetableId`, `sliceNb` |
| `evttimetableResetSliceByDate` | `timetableId`, `startDate`, `endDate` |
| `evttimetableput` | {allDay, calendarFirstDayOfWeek, dailyBriefNothingPlannedActivated, dailyBriefPushActivated, defaultReminderType, defaultReminderUnit, defaultReminderValue, emoji, endDate, finishDate, firstOccurrenceOffset, icalSubscriptionUrl, metaId, name, reminderActivated, sharedMemberIds, sharedToAll, showWeekends, startDate, …recurrence fields}, `allowDeleteEvent` |
| `evtupdate` | `option`, {allDay, attendee, birthDateNoYear, calendarId, color, colorId, description, emoji, endDate, isToAll, metaId, picture, placeId, private, reminder, reminderList, startDate, taskListId, text, timeZone, type, where, …recurrence fields} |
| `evtupdateoption` | {allDay, attendee, birthDateNoYear, calendarId, color, colorId, description, emoji, endDate, isToAll, metaId, picture, placeId, private, reminder, reminderList, startDate, taskListId, text, timeZone, type, where, …recurrence fields} |

### Google calendar link

| Method | Parameters |
| --- | --- |
| `googleAuthUri` | — |
| `googlegetcredential` | `credentialId` |
| `googlelogin` | `code` |
| `googlelogin2` | `code` |
| `googlesavetoken` | `tokenType`, `accessToken`, `refreshToken`, `expiresDate` |
| `googlesavetoken2` | `tokenType`, `accessToken`, `refreshToken`, `expiresDate` |
| `googleselectcalendar2` | `credentialId`, `googleId` |

### Outlook calendar link

| Method | Parameters |
| --- | --- |
| `outlookAuthUri` | — |
| `outlookgetcredential` | `credentialId` |
| `outlooklogin` | `code` |
| `outlooksavetoken` | `tokenType`, `accessToken`, `refreshToken`, `expiresDate`, `redirectUri`, `useSecret` |
| `outlookselectcalendar2` | `credentialId`, `outlookId` |
| `outlooksync` | `calendarId`, `syncToken` |

### Lists and tasks

| Method | Parameters |
| --- | --- |
| `taskcategorydelete` | `id` |
| `taskcategoryget` | `id` |
| `taskcategorylist` | `tasklistType`, `locale`, `filterTasklistId` |
| `taskcategoryput` | {emoji, filterTasklistId, metaId, name, taskListType}, `prevId`, `tasklistId`, `locale`, `hidden` |
| `taskcategorysync` | `syncToken` |
| `taskcloselist` | — |
| `taskcreate` | `text`, `dueDate`, `assignee`, `reminder` |
| `taskcreate2` | {assignee, description, dueDate, metaId, quantity, refId, reminder, taskCategoryId, taskId, taskListId, text, toAll, unit, …recurrence fields}, `picture` |
| `taskcreatelist` | {color, completedHidden, description, emoji, inputFile, metaId, name, pinSortingIndex, sharedMemberIds, sharedToAll, sortingIndex, systemId, taskCategoriesHidden, taskListType, taskSorting} |
| `taskdelete` | `taskId` |
| `taskdeletelist` | `id` |
| `taskduplicatelist` | `id` |
| `taskget` | `taskId` |
| `taskgetsettings` | — |
| `taskgetsuggestedlist` | — |
| `taskgettasklists` | — |
| `taskgettasksuggestions` | `tasklistType`, `syncToken`, `locale` |
| `taskgettasksuggestionswcat` | `tasklistType`, `syncToken`, `locale` |
| `tasklist` | `listId` |
| `taskmark` | `taskId`, `complete`, `completedDateForTesting` |
| `taskmetamark` | `id`, `complete` |
| `taskmove` | `taskId`, `taskListId`, `prevTaskId`, `taskCategoryId` |
| `taskmovelist` | `id`, `prevId` |
| `taskpinlist` | `id`, `pin` |
| `taskrespondsuggested` | `id`, `accept` |
| `taskrestoresystemlist` | — |
| `tasksync` | `syncToken`, `date` |
| `taskupdate` | `taskId`, `text`, `dueDate`, `assignee`, `reminder` |
| `taskupdate2` | {assignee, description, dueDate, metaId, quantity, refId, reminder, taskCategoryId, taskId, taskListId, text, toAll, unit, …recurrence fields}, `picture` |
| `taskupdatelist` | {color, completedHidden, description, emoji, inputFile, metaId, name, pinSortingIndex, sharedMemberIds, sharedToAll, sortingIndex, systemId, taskCategoriesHidden, taskListType, taskSorting} |

### Meal planner and recipes

| Method | Parameters |
| --- | --- |
| `mpadditemtolist2` | `ingredients`, `listId` |
| `mpcategorydelete` | `id` |
| `mpcategoryget` | `id` |
| `mpcategorylist` | — |
| `mpcategoryput` | {emoji, metaId, name}, `prevId` |
| `mpclear` | `from`, `to` |
| `mpcopy` | `from`, `to`, `targetFrom` |
| `mpcreate` | `name`, `date`, `type` |
| `mpcreateByRecipeId` | `recipeId`, `date`, `type` |
| `mpgenerateIA` | {cuisineType, directions, proteinType, units} |
| `mplistinterval` | `from`, `to` |
| `mpmealput` | {date, metaId, note, serves, type} |
| `mpmove` | `metaId`, `date`, `type` |
| `mpncrecipe` | `tokenvalue`, `recipeMetaId` |
| `mpncshared` | `tokenvalue` |
| `mpquantityparse` | `recipeids` |
| `mprecipelink` | `metaId` |
| `mprecipeput` | `recipe`, `picture` |
| `mprecipeputbyid` | `id`, `recipeCategories`, `recipeCategoryId` |
| `mprecipeputbyurl` | `url`, `recipeCategories`, `recipeCategoryId` |
| `mpsettingsget` | — |
| `mpsettingsset` | `settings` |
| `mpsharedlink` | `from`, `to` |

### Messaging

| Method | Parameters |
| --- | --- |
| `imgetpremium` | — |
| `immarkasread` | `threadId` |
| `immessagelist2` | `threadId`, `pg` |
| `immessagelistgrp` | `threadId`, `count` |
| `immessagesync` | `threadId`, `syncToken`, `date` |
| `immessagesyncgrp` | `request` |
| `imnewthread` | `to` |
| `imsend` | `threadId`, `to`, `text`, `media`, `type`, `externalId` |
| `imthreadlist` | `filter`, `isLoggedFamily` |

### Wall / activity feed

| Method | Parameters |
| --- | --- |
| `wallactivityById` | `masterNested` |
| `wallactivityget` | `accountId`, `masterNested` |
| `walladdComment` | `wall_message_id`, `comment`, `mood` |
| `wallbyids` | `id`, `masterNested` |
| `walldelete` | `wallMessageId` |
| `wallget` | `date`, `accountId`, `type`, `hasJoin`, `mood`, `bestMoment`, `afterId`, `nb`, `nested`, `masterNested`, `sortBy` |
| `walllastbyaccount` | `filter` |
| `wallmood` | `wall_message_id`, `add`, `remove` |
| `wallpublish` | `tagline` |
| `wallpublishmultiplepics` | `description`, `picture`, `nbOfPicturesUpload`, `wallMessageClientId`, `clientPicId`, `finishupload`, `familyIds`, `comment` |
| `wallpublishref` | `tagline`, `refObjectType`, `refObjectId` |

### Generic object operations

| Method | Parameters |
| --- | --- |
| `metaaddComment` | `id`, `text`, `mood` |
| `metaaddpictures` | `id`, `pictures` |
| `metadelete` | `id` |
| `metaget` | `id` |
| `metalist` | `id` |
| `metamood` | `id`, `add`, `remove` |
| `metapictures` | `id`, `pictures` |
| `metasync` | `id`, `listId`, `syncToken`, `date` |
| `metaupdatetext` | `id`, `text` |

### Contacts

| Method | Parameters |
| --- | --- |
| `ctccomment` | `contactId`, `text` |
| `ctcdelete` | `contactIds` |
| `ctcget` | `contactId` |
| `ctclist` | — |
| `ctcput` | {accountId, addresses, birthDate, birthDateNoYear, devices, firstName, function, gender, lastName, metaId, note}, `pictures` |
| `ctcsync` | `syncToken`, `date` |
| `ctcvcardimport` | `file`, `isPreview`, `indexes` |
| `ctcvcardurl` | `contactId` |

### Location

| Method | Parameters |
| --- | --- |
| `locacceptpickmeup` | `targetId` |
| `localarmpanicbutton` | `geocodedAddress` |
| `locclearAlarmpanicbutton` | — |
| `locget` | `accountId` |
| `locgetbyplace` | `placeId` |
| `locgetdeviceflag` | — |
| `locgetgeofencingsforpublisher` | `withPlace` |
| `locgetgeofencingsforsubscriber` | `placeId` |
| `locgetpositions2` | — |
| `lochistory` | `date` |
| `locpublisfencing` | `type`, `placeId`, `deviceId` |
| `locpublishaddress` | `text`, `address`, `latitudeE6`, `longitudeE6`, `isTemporary`, `picture` |
| `locpublishauto` | `geocodedAddress`, `deviceId`, `fromRequestAccountId` |
| `locpublishpickmeup` | `targetId`, `address`, `latitudeE6`, `longitudeE6` |
| `locpublishplacelocation` | `text`, `placeId`, `moveType`, `picture` |
| `locrequestautotrack` | `publisherId` |
| `locrequestpositionrefresh` | `accountId` |
| `locrespondtogeorequest` | `accept`, `tempDuration`, `geocodedAddress`, `deviceId` |
| `locsetdeviceflag` | {locationDeviceId, locationServiceActive} |
| `locsetgeofencingsettings` | `placeId`, `publisherId`, `in`, `out` |
| `locsetperuserauthflag` | `flags`, `tempDuration`, `geocodedAddress`, `deviceId` |

### Places

| Method | Parameters |
| --- | --- |
| `poicreate` | `name`, `geocodedAddress`, `placeType`, `isTemporary`, `geofencingActive`, `contactId`, `text`, `wifiSSID`, `wifiMAC`, `picture` |
| `poicreatesimple` | `name`, `address`, `placeType`, `isTemporary`, `geofencingActive`, `contactId`, `text`, `wifiSSID`, `wifiMAC`, `picture` |
| `poidelete` | `placeId` |
| `poiget` | `placeId` |
| `poigetall` | — |
| `poinearby` | `latitudeE6`, `longitudeE6` |
| `poisync` | `syncToken`, `date` |
| `poiupdate` | `placeId`, `name`, `geocodedAddress`, `placeType`, `isTemporary`, `geofencingActive`, `contactId`, `text`, `wifiSSID`, `wifiMAC`, `picture` |

### Geocoding

| Method | Parameters |
| --- | --- |
| `geoaddress` | `address` |
| `geoaddresswithcontext` | `address`, `latitudeE6`, `longitudeE6`, `start`, `count` |
| `geocheck` | `geocodedAddress` |
| `geodetailedaddress` | `country`, `state`, `zipCode`, `town`, `line` |
| `georeverse` | `latitudeE6`, `longitudeE6` |

### Budget

| Method | Parameters |
| --- | --- |
| `budgetcategorydelete` | `id` |
| `budgetcategoryget` | `id` |
| `budgetcategorylist` | `budgetTransactionType`, `locale` |
| `budgetcategoryput` | {budgetTransactionType, emoji, hidden, metaId, name}, `prevId` |
| `budgetcategorysync` | `syncToken` |
| `budgetclose` | `metaId` |
| `budgetdelete` | `id` |
| `budgetexportcsvurl` | `id`, `from`, `to` |
| `budgetget` | `id` |
| `budgetlist` | — |
| `budgetmarkaspaid` | `metaId`, `value` |
| `budgetpaymentmethoddelete` | `id` |
| `budgetpaymentmethodget` | `id` |
| `budgetpaymentmethodlist` | `locale` |
| `budgetpaymentmethodput` | {emoji, hidden, metaId, name}, `prevId` |
| `budgetpaymentmethodsync` | `syncToken` |
| `budgetput` | {budgetCategoryLimits, budgetLimit, budgetLimitActive, budgetLimitCategoryActive, currencyCode, emoji, mainKPI, metaId, name, paidUsage, recurrencyStartDay, sharedMemberIds, sharedToAll, …recurrence fields} |
| `budgetsync` | `syncToken` |
| `budgettransactiondelete` | `option`, `id` |
| `budgettransactiondeleteoption` | `id` |
| `budgettransactionget` | `id` |
| `budgettransactionlist` | — |
| `budgettransactionput` | `option`, {amount, budgetCategoryId, budgetId, budgetTransactionType, metaId, note, paidOccurence, paymentMethodId, relatedAccountId, reminderList, startDate, title, …recurrence fields}, `file` |
| `budgettransactionsync` | `syncToken` |
| `budgettransactionupdateoption` | {amount, budgetCategoryId, budgetId, budgetTransactionType, metaId, note, paidOccurence, paymentMethodId, relatedAccountId, reminderList, startDate, title, …recurrence fields} |

### Files

| Method | Parameters |
| --- | --- |
| `filerclose` | `metaId` |
| `filerdeletefile` | `id` |
| `filerdeletefolder` | `id` |
| `filerduplicatefolder` | `id`, `targetId` |
| `filergetfile` | `id` |
| `filergetfolder` | `id` |
| `filerlistfile` | — |
| `filerlistfolder` | — |
| `filerputfile` | {color, metaId, name, parentFolderId}, `file` |
| `filerputfolder` | {color, emoji, filerDisplayMode, filerSorting, metaId, name, parentFolderId, sharedMemberIds, sharedToAll} |
| `filersyncfile` | `syncToken` |
| `filersyncfolder` | `syncToken` |

### Albums

| Method | Parameters |
| --- | --- |
| `albumall` | `accountId`, `bestMoment`, `mood`, `pg` |
| `albumfrontbycreator` | — |
| `albumquota` | — |

### Colors

| Method | Parameters |
| --- | --- |
| `colordelete` | `id` |
| `colorget` | `id` |
| `colorlist` | — |
| `colorput` | {cc, metaId, name} |

### Subscription and credits

| Method | Parameters |
| --- | --- |
| `credit2checkouthomehubconfirmpurchase` | `code` |
| `credit2checkouthomehuburl` | `code` |
| `credit2checkouturl2` | — |
| `creditget` | — |
| `creditgetPromoCode` | `value` |
| `creditgetfreesku` | `creditType`, `paymentType`, `typeOfPeriod` |
| `creditgetmanualrenewalllink` | `creditId` |
| `creditgoogleplaytoken` | `deviceId`, `token`, `creditType`, `sku` |
| `credititunesIos7ticket` | `deviceId`, `receipt` |
| `credititunesreceiptstatus` | `deviceId`, `receipt`, `trialDurationProductIdList` |
| `credititunesticket` | `deviceId`, `receipt` |
| `creditlistall` | — |
| `creditsetautorenewall` | `creditId`, `auto` |
| `creditswitchfamily` | `creditId`, `existingFamilyId`, `newFamilyId` |
| `creditusepromocode` | `value` |

### Devices

| Method | Parameters |
| --- | --- |
| `deviceackpush` | `pushIds` |
| `devicecheckpush` | {MCC, MNC, applicationVersion, buildTimestamp, deviceId, languageSystem, metaId, modelType, nativeAppId, notificationTokenId, partnerType, systemName, systemVersion}, `isBackground` |
| `devicedelete` | `deviceId` |
| `devicelist` | — |
| `devicelogout` | `config` |
| `devicesetconfig` | `config` |

### Launchpad / home screen

| Method | Parameters |
| --- | --- |
| `launchpadclick` | `section`, `date` |
| `launchpadcondition` | `activityWanted` |
| `launchpadget2` | `address`, `conditions`, `actions` |
| `launchpadget3` | `token`, `address`, `conditions` |
| `launchpadgetexplore` | `token` |
| `launchpadlisttiles` | — |
| `launchpadmovetile` | `tileId`, `prevId` |
| `launchpadseen` | `screen`, `clear` |
| `launchpadupdatetile` | {active, metaId} |

### Web helpers

| Method | Parameters |
| --- | --- |
| `webapiurl` | — |
| `webget` | `var` |
| `webgetExternalWebUrl` | `partnerType` |
| `webgetWebSocketUrl` | — |
| `webhomehubvalidatecode` | `code` |
| `webiaimportemail` | `email`, `from`, `ical` |
| `webjslog` | `text` |
| `webog` | `url`, `refresh` |
| `webset` | `var`, `value` |

### Other

| Method | Parameters |
| --- | --- |
| `statusget` | — |
| `stublistsms` | `number` |

