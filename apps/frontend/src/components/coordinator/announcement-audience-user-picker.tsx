"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthUserRecord } from "@/types/profile";

export type AnnouncementAudienceUser = Pick<
  AuthUserRecord,
  "id" | "fullName" | "email" | "role" | "isActive"
>;

interface AnnouncementAudienceUserPickerProps {
  users: AnnouncementAudienceUser[];
  selectedIds: string[];
  onChange: (userIds: string[]) => void;
  isLoading?: boolean;
}

export function AnnouncementAudienceUserPicker({
  users,
  selectedIds,
  onChange,
  isLoading = false,
}: AnnouncementAudienceUserPickerProps) {
  const [query, setQuery] = useState("");

  const uniqueUsers = useMemo(() => {
    const byId = new Map<string, AnnouncementAudienceUser>();
    for (const user of users) {
      if (!byId.has(user.id)) {
        byId.set(user.id, user);
      }
    }
    return [...byId.values()];
  }, [users]);

  const selectedUsers = useMemo(() => {
    const byId = new Map(uniqueUsers.map((user) => [user.id, user] as const));
    return selectedIds
      .map((id) => byId.get(id))
      .filter((user): user is AnnouncementAudienceUser => !!user);
  }, [selectedIds, uniqueUsers]);

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }

    return uniqueUsers
      .filter((user) => user.isActive !== false)
      .filter((user) => !selectedIds.includes(user.id))
      .filter((user) => {
        const name = user.fullName.toLowerCase();
        const email = user.email.toLowerCase();
        return name.includes(needle) || email.includes(needle);
      })
      .slice(0, 8);
  }, [query, selectedIds, uniqueUsers]);

  const addUser = (userId: string) => {
    if (selectedIds.includes(userId)) {
      return;
    }
    onChange([...selectedIds, userId]);
    setQuery("");
  };

  const removeUser = (userId: string) => {
    onChange(selectedIds.filter((id) => id !== userId));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="announcement-audience-users">Specific individuals</Label>
        <Input
          id="announcement-audience-users"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Combines with role audience. Clear roles to send only to
          selected people.
        </p>
      </div>

      {query.trim() ? (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
          {searchResults.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No matching workspace users
            </p>
          ) : (
            searchResults.map((user) => (
              <button
                key={user.id}
                type="button"
                className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => addUser(user.id)}
              >
                <span className="font-medium">{user.fullName}</span>
                <span className="text-xs text-muted-foreground">
                  {user.email} · {user.role}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {selectedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="max-w-[12rem] truncate">
                {user.fullName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => removeUser(user.id)}
                aria-label={`Remove ${user.fullName}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
