import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import EventDetailClient from "./EventDetailClient";

export type EventDetailRow = {
  id: string;
  title: string | null;
  event_date: string;
  location: string | null;
  description: string | null;
  organization_id: string;
  organizations: { id: string; name: string | null; logo_url: string | null } | null;
};

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: event, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      event_date,
      location,
      description,
      organization_id,
      organizations ( id, name, logo_url )
    `
    )
    .eq("id", id)
    .single();

  if (error || !event) notFound();

  return <EventDetailClient event={event as EventDetailRow} />;
}
