-- Allow band slots to have no fixed end time ("mal sehen …")
ALTER TABLE band_slots ALTER COLUMN ends_at DROP NOT NULL;
