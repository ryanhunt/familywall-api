import FamilyWallClient from "./client.js";
import type {
  AllFamilyResponse,
  RawMember,
  RawMedia,
  RawProfile,
  Member,
  MemberDevice,
  MemberIdentifier,
  MemberMedia,
  FamilySettings,
  FamilyCoverMedia,
  Thread,
  PremiumDetails,
  ProfileDetails,
  CalendarEvent,
  CreateEventRequest,
  AddListItemRequest,
  CreateListRequest,
  GetCalendarRangeOptions,
  GetListsOptions,
  ListDetails,
  ListItem,
  ListSummary,
} from "./types.js";

export default class Family {
  private readonly data: AllFamilyResponse;
  private readonly familyId: string;
  private readonly client: FamilyWallClient;

  constructor(data: AllFamilyResponse, client: FamilyWallClient) {
    this.data = data;
    this.familyId = data.a00.r.r.family_id;
    this.client = client;
  }

  async updateCalendarEvent(eventId: string, event: CreateEventRequest): Promise<CalendarEvent> {
    return await this.client.updateEvent(eventId, event);
  }

  async createCalendarEvent(event: CreateEventRequest): Promise<CalendarEvent> {
    return await this.client.createEvent(event);
  }

  async deleteCalendarEvent(eventId: string): Promise<boolean> {
    return await this.client.deleteEvent(eventId);
  }

  /**
   * Without options this keeps the original unfiltered sync request. With a
   * range it routes to the interval endpoint, which is a different server
   * operation rather than a filter applied to the sync result.
   */
  async getCalendarEvents(options?: GetCalendarRangeOptions): Promise<CalendarEvent[]> {
    if (options === undefined) {
      const calendar = await this.client.getCalendar(`calendar/${this.familyId}`)
      return calendar.updatedCreated;
    }
    return await this.client.getCalendarEventsInRange(
      `calendar/${this.familyId}`,
      options
    );
  }

  async getLists(options?: GetListsOptions): Promise<ListSummary[]> {
    return await this.client.getLists(options);
  }

  async getList(listId: string): Promise<ListDetails> {
    return await this.client.getList(listId);
  }

  async createList(input: CreateListRequest): Promise<ListSummary> {
    return await this.client.createList(input);
  }

  async addListItem(listId: string, input: AddListItemRequest): Promise<ListItem> {
    return await this.client.addListItem(listId, input);
  }

  async setListItemCompleted(itemId: string, completed: boolean): Promise<void> {
    await this.client.setListItemCompleted(itemId, completed);
  }

  getMembers(): Member[] {
    return this.data.a00.r.r.members.map((member) =>
      this._getMemberDetails(member)
    );
  }

  getMember(firstName: string): Member | null {
    const member = this.data.a00.r.r.members.find(
      (m) => m.firstName === firstName
    );
    return member ? this._getMemberDetails(member) : null;
  }

  getMemberProfile(accountId: string): ProfileDetails | null {
    const profile = this.data.a01?.r?.r[accountId];
    return profile ? this._getProfileDetails(profile) : null;
  }

  getFamilySettings(): FamilySettings | null {
    const settings = this.data.a03?.r?.r;
    return settings
      ? {
        familyId: settings.familyId,
        reminderValue: settings.defaultReminderValue,
        geolocSharing: settings.geolocSharing,
        calendarFirstDayOfWeek: settings.calendarFirstDayOfWeek,
      }
      : null;
  }

  getFamilyMedia(): FamilyCoverMedia[] {
    return this.data.a00.r.r.coverMedias.map((media) => ({
      pictureUrl: media.pictureUrl,
      resolution: `${media.resolutionX}x${media.resolutionY}`,
      creationDate: media.creationDate,
      mimeType: media.mimeType,
    }));
  }

  getMessages(): Thread[] | undefined {
    return this.data.a05?.r?.r.map((thread) => ({
      threadId: thread.metaId,
      participants: thread.participants.map((participant) => ({
        accountId: participant.accountId,
        firstName: participant.accountFirstname,
        lastReadMessageDate: participant.lastReadMessageDate,
      })),
      unreadCount: thread.unreadCount,
      messageCount: thread.messageCount,
    }));
  }

  getPremiumAccountDetails(): PremiumDetails | null {
    const premium = this.data.a06?.r?.r.premium;
    return premium
      ? {
        premiumMember: premium.fWPremiumMemberSubscriber,
        familyQuota: premium.familyQuota,
        premiumFeatures: {
          geoFencing: premium.geoFencingActivated,
          audioAvailable: premium.audio,
          videoAvailable: premium.videoAvailable,
        },
      }
      : null;
  }

  private _getMemberDetails(member: RawMember): Member {
    return {
      firstName: member.firstName,
      email: member.identifiers.find((id) => id.type === "Email")?.value,
      role: member.role,
      lastLoginDate: member.lastLoginDate,
      joinDate: member.joinDate,
      profileFamilyId: member.profileFamilyId,
      pictureURI: member.pictureURI,
      timeZone: member.timeZone,
      right: member.right,
      devices: this._getMemberDevices(member),
      identifiers: this._getMemberIdentifiers(member),
      medias: this._getMemberMedias(member),
      rights: {
        canUpdate: member.rights?.canUpdate || false,
        canDelete: member.rights?.canDelete || false,
      },
    };
  }

  private _getMemberDevices(member: RawMember): MemberDevice[] {
    return member.devices.map((device) => ({
      deviceType: device.deviceType,
      deviceId: device.deviceId,
      value: device.value,
    }));
  }

  private _getMemberIdentifiers(member: RawMember): MemberIdentifier[] {
    return member.identifiers.map((identifier) => ({
      type: identifier.type,
      value: identifier.value,
      validated: identifier.validated === "true",
    }));
  }

  private _getMemberMedias(member: RawMember): MemberMedia[] {
    return member.medias.map((media) => ({
      pictureUrl: media.pictureUrl,
      canUpdate: media.rights?.canUpdate || false,
      canDelete: media.rights?.canDelete || false,
    }));
  }

  private _getProfileDetails(profile: RawProfile): ProfileDetails {
    return {
      firstName: profile.firstName,
      email: profile.devices?.[0]?.value,
      timeZone: profile.timeZone,
      accountId: profile.accountId,
      pictureURI: profile.pictureURI,
      medias: this._getProfileMedias(profile.medias),
    };
  }

  private _getProfileMedias(medias: RawMedia[]): MemberMedia[] {
    return medias.map((media) => ({
      pictureUrl: media.pictureUrl,
      canUpdate: media.rights?.canUpdate || false,
      canDelete: media.rights?.canDelete || false,
    }));
  }
}
