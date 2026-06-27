"use client";

import { Clock, Send, Users } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/profile-view-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Supervisor } from "@/types/student";
import type { UserProfile } from "@/types/profile";

interface SupervisorBrowseCardProps {
  supervisor: Supervisor;
  profile?: UserProfile;
  isSending?: boolean;
  disabled?: boolean;
  onViewProfile: () => void;
  onSendRequest: () => void;
}

export function SupervisorBrowseCard({
  supervisor,
  profile,
  isSending,
  disabled,
  onViewProfile,
  onSendRequest,
}: SupervisorBrowseCardProps) {
  const researchAreas =
    supervisor.researchAreas?.length
      ? supervisor.researchAreas
      : profile?.researchAreas ?? [];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <ProfileAvatar
            profile={profile}
            className="h-12 w-12"
          />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-tight">
              {supervisor.fullName}
            </CardTitle>
            <CardDescription className="mt-1">
              {supervisor.designation || profile?.designation || "Supervisor"}
              {(supervisor.department || profile?.department) &&
                ` · ${supervisor.department ?? profile?.department}`}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              supervisor.isAvailable === false
                ? "border-amber-500/40 text-amber-700"
                : "border-emerald-500/40 text-emerald-700"
            }
          >
            {supervisor.isAvailable === false ? "Limited" : "Available"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm">
        {researchAreas.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Research areas
            </p>
            <div className="flex flex-wrap gap-1">
              {researchAreas.slice(0, 4).map((area) => (
                <Badge key={area} variant="secondary" className="text-[10px]">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {supervisor.supervisedTeamCount ?? 0} teams
          </span>
          {supervisor.officeHours && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {supervisor.officeHours}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        <Button type="button" variant="outline" size="sm" onClick={onViewProfile}>
          View Profile
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={disabled || isSending || supervisor.isAvailable === false}
          onClick={onSendRequest}
        >
          {isSending ? "Sending..." : (
            <>
              <Send className="h-4 w-4" />
              Send Request
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
