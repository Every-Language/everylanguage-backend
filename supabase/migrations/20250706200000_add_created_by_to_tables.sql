ALTER TABLE projects
ADD COLUMN created_by UUID REFERENCES users (id);


ALTER TABLE sequences
ADD COLUMN created_by UUID REFERENCES users (id);


ALTER TABLE sequences_segments
ADD COLUMN created_by UUID REFERENCES users (id);


ALTER TABLE sequences_tags
ADD COLUMN created_by UUID REFERENCES users (id);


ALTER TABLE segments_targets
ADD COLUMN created_by UUID REFERENCES users (id);
