-- Change duration and timing columns from integer to float for better precision
-- Update media_files table
ALTER TABLE media_files
ALTER COLUMN duration_seconds type REAL USING duration_seconds::REAL;


-- Update media_files_verses table  
ALTER TABLE media_files_verses
ALTER COLUMN start_time_seconds type REAL USING start_time_seconds::REAL,
ALTER COLUMN duration_seconds type REAL USING duration_seconds::REAL;


-- Update media_file_listens table
ALTER TABLE media_file_listens
ALTER COLUMN position_seconds type REAL USING position_seconds::REAL,
ALTER COLUMN duration_seconds type REAL USING duration_seconds::REAL;
