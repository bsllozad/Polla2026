import { UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { listParticipants } from "@/infrastructure/repositories/participantsRepository";
import { getCurrentUserProfile } from "@/infrastructure/repositories/profilesRepository";

export function ParticipantSwitcher() {
  const { activeParticipant, setActiveParticipant } = useActiveParticipantStore();
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: getCurrentUserProfile
  });
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["participants"],
    queryFn: listParticipants
  });
  const isAdmin = profile?.role === "superadmin";
  const ownParticipant = participants.find((participant) => participant.userId === profile?.id);
  const selectableParticipants = isAdmin ? participants : ownParticipant ? [ownParticipant] : [];

  useEffect(() => {
    const defaultParticipant = isAdmin ? participants[0] : ownParticipant;
    const canKeepCurrent = isAdmin || activeParticipant?.id === ownParticipant?.id;

    if (defaultParticipant && (!activeParticipant || !canKeepCurrent)) {
      setActiveParticipant(defaultParticipant);
    }
  }, [activeParticipant, isAdmin, ownParticipant, participants, setActiveParticipant]);

  return (
    <label className="participant-switcher">
      <UserRound size={18} />
      <select value={activeParticipant?.id ?? ""} disabled={!isAdmin || isLoading || selectableParticipants.length === 0} onChange={(event) => {
        const participant = selectableParticipants.find((item) => item.id === event.target.value);
        if (participant) setActiveParticipant(participant);
      }}>
        {selectableParticipants.length === 0 ? <option value="">Sin participante</option> : null}
        {selectableParticipants.map((participant) => (
          <option key={participant.id} value={participant.id}>
            {participant.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
