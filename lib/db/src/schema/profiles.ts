import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const profilesTable = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id").notNull().unique(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull().default(""),
    bio: text("bio").notNull().default(""),
    showAvatar: boolean("show_avatar").notNull().default(true),
    location: text("location").notNull().default(""),
    theme: text("theme").notNull().default("ember"),
    backgroundColor: text("background_color").notNull().default("#000000"),
    displayNameColor: text("display_name_color").notNull().default("#ffffff"),
    descriptionColor: text("description_color").notNull().default("#c2b9cb"),
    locationColor: text("location_color").notNull().default("#e2dbe9"),
    socialColor: text("social_color").notNull().default("#f7f3ff"),
    musicColor: text("music_color").notNull().default("#dfd7e8"),
    viewsColor: text("views_color").notNull().default("#afa4bb"),
    enterTextColor: text("enter_text_color").notNull().default("#f6f2fc"),
    glowIntensity: integer("glow_intensity").notNull().default(45),
    showProfileFrame: boolean("show_profile_frame").notNull().default(true),
    profileFrameColor: text("profile_frame_color").notNull().default("#c296ff"),
    profileFrameBackgroundColor: text("profile_frame_background_color").notNull().default("#17121d"),
    profileFrameBlur: integer("profile_frame_blur").notNull().default(8),
    backgroundEffect: text("background_effect").notNull().default("black"),
    premiumBackground: text("premium_background").notNull().default("none"),
    premiumBackgroundStrength: integer("premium_background_strength").notNull().default(55),
    premiumFont: text("premium_font").notNull().default("default"),
    premiumTextEffect: text("premium_text_effect").notNull().default("none"),
    showProBadge: boolean("show_pro_badge").notNull().default(false),
    showCredit: boolean("show_credit").notNull().default(true),
    extraAudioTracks: jsonb("extra_audio_tracks").$type<{ path: string | null; title: string }[]>().notNull().default([]),
    avatarX: integer("avatar_x").notNull().default(50),
    avatarY: integer("avatar_y").notNull().default(50),
    avatarZoom: integer("avatar_zoom").notNull().default(100),
    avatarPath: text("avatar_path"),
    backgroundPath: text("background_path"),
    backgroundType: text("background_type"),
    audioPath: text("audio_path"),
    audioTitle: text("audio_title").notNull().default(""),
    audioCoverPath: text("audio_cover_path"),
    showMusicPlayer: boolean("show_music_player").notNull().default(true),
    showVolumeControl: boolean("show_volume_control").notNull().default(true),
    musicVolume: integer("music_volume").notNull().default(80),
    focusX: integer("focus_x").notNull().default(50),
    focusY: integer("focus_y").notNull().default(50),
    dimOpacity: integer("dim_opacity").notNull().default(35),
    enterText: text("enter_text").notNull().default("Click to enter"),
    showViews: boolean("show_views").notNull().default(true),
    viewCount: integer("view_count").notNull().default(0),
    isSuspended: boolean("is_suspended").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("profiles_username_lower_unique").on(table.username),
    index("profiles_updated_at_idx").on(table.updatedAt),
  ],
);

export const profileLinksTable = pgTable(
  "profile_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    mode: text("mode").notNull(),
    value: text("value").notNull(),
    label: text("label"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("profile_links_profile_sort_idx").on(table.profileId, table.sortOrder),
  ],
);

export const profileAssetsTable = pgTable(
  "profile_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectPath: text("object_path").notNull().unique(),
    ownerId: text("owner_id").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("profile_assets_owner_idx").on(table.ownerId)],
);

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
export type ProfileLink = typeof profileLinksTable.$inferSelect;
export type ProfileAsset = typeof profileAssetsTable.$inferSelect;
