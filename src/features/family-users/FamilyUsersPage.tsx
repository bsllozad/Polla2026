import { Camera, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { listParticipants } from "@/infrastructure/repositories/participantsRepository";

export function FamilyUsersPage() {
  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["participants"],
    queryFn: listParticipants
  });

  return (
    <div className="stack">
      <Card>
        <CardHeader>
          <CardTitle>Participantes</CardTitle>
          <Button><Plus size={16} /> Agregar</Button>
        </CardHeader>
        <div className="participant-grid">
          {isLoading ? <p className="empty-state">Cargando participantes...</p> : null}
          {!isLoading && participants.length === 0 ? <p className="empty-state">Todavia no hay participantes.</p> : null}
          {participants.map((participant) => (
            <article key={participant.id} className="participant-card">
              <div className="avatar"><Camera size={20} /></div>
              <strong>{participant.displayName}</strong>
              <span>Activo</span>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
