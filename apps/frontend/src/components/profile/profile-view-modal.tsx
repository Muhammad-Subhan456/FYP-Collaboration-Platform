import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserProfile } from "@/types/profile";

interface ProfileViewModalProps {
  profile: UserProfile | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileViewModal({
  profile,
  open,
  onOpenChange,
}: ProfileViewModalProps) {
  if (!profile) return null;

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profile.profilePicture && (
                <AvatarImage src={profile.profilePicture} alt={profile.fullName} />
              )}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{profile.fullName}</h3>
              {profile.email && (
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              )}
            </div>
          </div>

          {profile.profileType === "STUDENT" && (
            <div className="grid gap-3 text-sm">
              {profile.registrationNumber && (
                <Row label="Registration #" value={profile.registrationNumber} />
              )}
              {profile.department && (
                <Row label="Department" value={profile.department} />
              )}
              {profile.batch && <Row label="Batch" value={profile.batch} />}
              {profile.degreeProgram && (
                <Row label="Program" value={profile.degreeProgram} />
              )}
              {profile.semester != null && (
                <Row label="Semester" value={String(profile.semester)} />
              )}
              {profile.skills?.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-muted-foreground">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.skills.map((s, index) => (
                      <Badge key={`skill-${index}-${s}`} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.interests?.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-muted-foreground">Interests</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.interests.map((s, index) => (
                      <Badge key={`interest-${index}-${s}`} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.bio && <Row label="Bio" value={profile.bio} />}
              {profile.github && (
                <a href={profile.github} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              )}
              {profile.linkedIn && (
                <a href={profile.linkedIn} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

export function ProfileAvatar({
  profile,
  className,
}: {
  profile?: UserProfile | null;
  className?: string;
}) {
  const initials =
    profile?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  return (
    <Avatar className={className}>
      {profile?.profilePicture && (
        <AvatarImage src={profile.profilePicture} alt={profile.fullName} />
      )}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
