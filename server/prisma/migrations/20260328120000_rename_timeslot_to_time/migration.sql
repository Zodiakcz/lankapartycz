-- Wipe existing schedule data (timeSlot values incompatible with new time format)
DELETE FROM "Schedule";

-- Rename timeSlot to time
ALTER TABLE "Schedule" RENAME COLUMN "timeSlot" TO "time";
