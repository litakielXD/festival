-- Enable Realtime replication for core chat, lineup, and collaborative timeline tables
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'festival_direct_messages'
  ) then
    alter publication supabase_realtime add table public.festival_direct_messages;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'festival_group_messages'
  ) then
    alter publication supabase_realtime add table public.festival_group_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'band_slots'
  ) then
    alter publication supabase_realtime add table public.band_slots;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bands'
  ) then
    alter publication supabase_realtime add table public.bands;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'band_slot_proposals'
  ) then
    alter publication supabase_realtime add table public.band_slot_proposals;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'festival_band_genres'
  ) then
    alter publication supabase_realtime add table public.festival_band_genres;
  end if;
end $$;
