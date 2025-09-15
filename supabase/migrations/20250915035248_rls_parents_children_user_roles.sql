-- RLS policies for parents (projects, bases, teams, partner_orgs),
-- project children (audio_versions, text_versions, media_files, media_files_tags,
-- media_files_targets, media_files_verses, tags, verse_texts),
-- and user_roles (manage roles via *.manage_roles).
-- Parents: public SELECT; write/delete via has_permission
ALTER TABLE public.projects enable ROW level security;


DROP POLICY if EXISTS projects_select_public ON public.projects;


CREATE POLICY projects_select_public ON public.projects FOR
SELECT
  USING (TRUE);


DROP POLICY if EXISTS projects_insert_with_permission ON public.projects;


CREATE POLICY projects_insert_with_permission ON public.projects FOR insert
WITH
  CHECK (
    public.has_permission (auth.uid (), 'project.write', 'project', id)
  );


DROP POLICY if EXISTS projects_update_with_permission ON public.projects;


CREATE POLICY projects_update_with_permission ON public.projects
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'project.write', 'project', id)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'project.write', 'project', id)
  );


DROP POLICY if EXISTS projects_delete_with_permission ON public.projects;


CREATE POLICY projects_delete_with_permission ON public.projects FOR delete USING (
  public.has_permission (auth.uid (), 'project.delete', 'project', id)
);


ALTER TABLE public.bases enable ROW level security;


DROP POLICY if EXISTS bases_select_public ON public.bases;


CREATE POLICY bases_select_public ON public.bases FOR
SELECT
  USING (TRUE);


DROP POLICY if EXISTS bases_insert_with_permission ON public.bases;


CREATE POLICY bases_insert_with_permission ON public.bases FOR insert
WITH
  CHECK (
    public.has_permission (auth.uid (), 'base.write', 'base', id)
  );


DROP POLICY if EXISTS bases_update_with_permission ON public.bases;


CREATE POLICY bases_update_with_permission ON public.bases
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'base.write', 'base', id)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'base.write', 'base', id)
  );


DROP POLICY if EXISTS bases_delete_with_permission ON public.bases;


CREATE POLICY bases_delete_with_permission ON public.bases FOR delete USING (
  public.has_permission (auth.uid (), 'base.delete', 'base', id)
);


ALTER TABLE public.teams enable ROW level security;


DROP POLICY if EXISTS teams_select_public ON public.teams;


CREATE POLICY teams_select_public ON public.teams FOR
SELECT
  USING (TRUE);


DROP POLICY if EXISTS teams_insert_with_permission ON public.teams;


CREATE POLICY teams_insert_with_permission ON public.teams FOR insert
WITH
  CHECK (
    public.has_permission (auth.uid (), 'team.write', 'team', id)
  );


DROP POLICY if EXISTS teams_update_with_permission ON public.teams;


CREATE POLICY teams_update_with_permission ON public.teams
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'team.write', 'team', id)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'team.write', 'team', id)
  );


DROP POLICY if EXISTS teams_delete_with_permission ON public.teams;


CREATE POLICY teams_delete_with_permission ON public.teams FOR delete USING (
  public.has_permission (auth.uid (), 'team.delete', 'team', id)
);


ALTER TABLE public.partner_orgs enable ROW level security;


DROP POLICY if EXISTS partner_orgs_select_public ON public.partner_orgs;


CREATE POLICY partner_orgs_select_public ON public.partner_orgs FOR
SELECT
  USING (TRUE);


DROP POLICY if EXISTS partner_orgs_insert_with_permission ON public.partner_orgs;


CREATE POLICY partner_orgs_insert_with_permission ON public.partner_orgs FOR insert
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      id
    )
  );


DROP POLICY if EXISTS partner_orgs_update_with_permission ON public.partner_orgs;


CREATE POLICY partner_orgs_update_with_permission ON public.partner_orgs
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      id
    )
  );


DROP POLICY if EXISTS partner_orgs_delete_with_permission ON public.partner_orgs;


CREATE POLICY partner_orgs_delete_with_permission ON public.partner_orgs FOR delete USING (
  public.has_permission (
    auth.uid (),
    'partner.manage_roles',
    'partner',
    id
  )
);


-- Children: inherit project permissions via project_id or join through media_files
ALTER TABLE public.audio_versions enable ROW level security;


DROP POLICY if EXISTS audio_versions_select_inherit_project ON public.audio_versions;


CREATE POLICY audio_versions_select_inherit_project ON public.audio_versions FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.projects p
      WHERE
        p.id = audio_versions.project_id
    )
  );


DROP POLICY if EXISTS audio_versions_ins_with_project_write ON public.audio_versions;


CREATE POLICY audio_versions_ins_with_project_write ON public.audio_versions FOR insert
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS audio_versions_upd_with_project_write ON public.audio_versions;


CREATE POLICY audio_versions_upd_with_project_write ON public.audio_versions
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS audio_versions_del_with_project_delete ON public.audio_versions;


CREATE POLICY audio_versions_del_with_project_delete ON public.audio_versions FOR delete USING (
  public.has_permission (
    auth.uid (),
    'project.delete',
    'project',
    project_id
  )
);


ALTER TABLE public.text_versions enable ROW level security;


DROP POLICY if EXISTS text_versions_select_inherit_project ON public.text_versions;


CREATE POLICY text_versions_select_inherit_project ON public.text_versions FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.projects p
      WHERE
        p.id = text_versions.project_id
    )
  );


DROP POLICY if EXISTS text_versions_ins_with_project_write ON public.text_versions;


CREATE POLICY text_versions_ins_with_project_write ON public.text_versions FOR insert
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS text_versions_upd_with_project_write ON public.text_versions;


CREATE POLICY text_versions_upd_with_project_write ON public.text_versions
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS text_versions_del_with_project_delete ON public.text_versions;


CREATE POLICY text_versions_del_with_project_delete ON public.text_versions FOR delete USING (
  public.has_permission (
    auth.uid (),
    'project.delete',
    'project',
    project_id
  )
);


ALTER TABLE public.media_files enable ROW level security;


DROP POLICY if EXISTS media_files_select_inherit_project ON public.media_files;


CREATE POLICY media_files_select_inherit_project ON public.media_files FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.audio_versions av
      WHERE
        av.id = media_files.audio_version_id
    )
  );


DROP POLICY if EXISTS media_files_ins_with_project_write ON public.media_files;


CREATE POLICY media_files_ins_with_project_write ON public.media_files FOR insert
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.audio_versions av
      WHERE
        av.id = media_files.audio_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_upd_with_project_write ON public.media_files;


CREATE POLICY media_files_upd_with_project_write ON public.media_files
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.audio_versions av
      WHERE
        av.id = media_files.audio_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.audio_versions av
      WHERE
        av.id = media_files.audio_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_del_with_project_delete ON public.media_files;


CREATE POLICY media_files_del_with_project_delete ON public.media_files FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.audio_versions av
    WHERE
      av.id = media_files.audio_version_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        av.project_id
      )
  )
);


ALTER TABLE public.media_files_tags enable ROW level security;


DROP POLICY if EXISTS media_files_tags_select_inherit_project ON public.media_files_tags;


CREATE POLICY media_files_tags_select_inherit_project ON public.media_files_tags FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
      WHERE
        mf.id = media_files_tags.media_file_id
    )
  );


DROP POLICY if EXISTS media_files_tags_ins_with_project_write ON public.media_files_tags;


CREATE POLICY media_files_tags_ins_with_project_write ON public.media_files_tags FOR insert
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_tags.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_tags_upd_with_project_write ON public.media_files_tags;


CREATE POLICY media_files_tags_upd_with_project_write ON public.media_files_tags
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_tags.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_tags.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_tags_del_with_project_delete ON public.media_files_tags;


CREATE POLICY media_files_tags_del_with_project_delete ON public.media_files_tags FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.media_files mf
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
    WHERE
      mf.id = media_files_tags.media_file_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        av.project_id
      )
  )
);


ALTER TABLE public.media_files_targets enable ROW level security;


DROP POLICY if EXISTS media_files_targets_select_inherit_project ON public.media_files_targets;


CREATE POLICY media_files_targets_select_inherit_project ON public.media_files_targets FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
      WHERE
        mf.id = media_files_targets.media_file_id
    )
  );


DROP POLICY if EXISTS media_files_targets_ins_with_project_write ON public.media_files_targets;


CREATE POLICY media_files_targets_ins_with_project_write ON public.media_files_targets FOR insert
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_targets.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_targets_upd_with_project_write ON public.media_files_targets;


CREATE POLICY media_files_targets_upd_with_project_write ON public.media_files_targets
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_targets.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_targets.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_targets_del_with_project_delete ON public.media_files_targets;


CREATE POLICY media_files_targets_del_with_project_delete ON public.media_files_targets FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.media_files mf
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
    WHERE
      mf.id = media_files_targets.media_file_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        av.project_id
      )
  )
);


ALTER TABLE public.media_files_verses enable ROW level security;


DROP POLICY if EXISTS media_files_verses_select_inherit_project ON public.media_files_verses;


CREATE POLICY media_files_verses_select_inherit_project ON public.media_files_verses FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
      WHERE
        mf.id = media_files_verses.media_file_id
    )
  );


DROP POLICY if EXISTS media_files_verses_ins_with_project_write ON public.media_files_verses;


CREATE POLICY media_files_verses_ins_with_project_write ON public.media_files_verses FOR insert
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_verses.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_verses_upd_with_project_write ON public.media_files_verses;


CREATE POLICY media_files_verses_upd_with_project_write ON public.media_files_verses
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_verses.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_verses.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_verses_del_with_project_delete ON public.media_files_verses;


CREATE POLICY media_files_verses_del_with_project_delete ON public.media_files_verses FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.media_files mf
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
    WHERE
      mf.id = media_files_verses.media_file_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        av.project_id
      )
  )
);


ALTER TABLE public.tags enable ROW level security;


DROP POLICY if EXISTS tags_select_linked_to_project_media ON public.tags;


CREATE POLICY tags_select_linked_to_project_media ON public.tags FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files_tags mft
        JOIN public.media_files mf ON mf.id = mft.media_file_id
      WHERE
        mft.tag_id = tags.id
    )
  );


ALTER TABLE public.verse_texts enable ROW level security;


-- verse_texts lacks direct project_id; derive via text_versions.project_id
DROP POLICY if EXISTS verse_texts_select_inherit_project ON public.verse_texts;


CREATE POLICY verse_texts_select_inherit_project ON public.verse_texts FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.text_versions tv
      WHERE
        tv.id = verse_texts.text_version_id
    )
  );


DROP POLICY if EXISTS verse_texts_ins_with_project_write ON public.verse_texts;


CREATE POLICY verse_texts_ins_with_project_write ON public.verse_texts FOR insert
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.text_versions tv
      WHERE
        tv.id = verse_texts.text_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          tv.project_id
        )
    )
  );


DROP POLICY if EXISTS verse_texts_upd_with_project_write ON public.verse_texts;


CREATE POLICY verse_texts_upd_with_project_write ON public.verse_texts
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.text_versions tv
      WHERE
        tv.id = verse_texts.text_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          tv.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.text_versions tv
      WHERE
        tv.id = verse_texts.text_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          tv.project_id
        )
    )
  );


DROP POLICY if EXISTS verse_texts_del_with_project_delete ON public.verse_texts;


CREATE POLICY verse_texts_del_with_project_delete ON public.verse_texts FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.text_versions tv
    WHERE
      tv.id = verse_texts.text_version_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        tv.project_id
      )
  )
);


-- Role assignment policies for user_roles
ALTER TABLE public.user_roles enable ROW level security;


DROP POLICY if EXISTS user_roles_select_self_or_manager ON public.user_roles;


CREATE POLICY user_roles_select_self_or_manager ON public.user_roles FOR
SELECT
  USING (
    user_id = auth.uid ()
    OR CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'team' THEN public.has_permission (
        auth.uid (),
        'team.manage_roles',
        'team',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_insert_with_manage ON public.user_roles;


CREATE POLICY user_roles_insert_with_manage ON public.user_roles FOR insert
WITH
  CHECK (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'team' THEN public.has_permission (
        auth.uid (),
        'team.manage_roles',
        'team',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_update_with_manage ON public.user_roles;


CREATE POLICY user_roles_update_with_manage ON public.user_roles
FOR UPDATE
  USING (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'team' THEN public.has_permission (
        auth.uid (),
        'team.manage_roles',
        'team',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  )
WITH
  CHECK (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'team' THEN public.has_permission (
        auth.uid (),
        'team.manage_roles',
        'team',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_delete_with_manage ON public.user_roles;


CREATE POLICY user_roles_delete_with_manage ON public.user_roles FOR delete USING (
  CASE context_type
    WHEN 'project' THEN public.has_permission (
      auth.uid (),
      'project.manage_roles',
      'project',
      context_id::UUID
    )
    WHEN 'team' THEN public.has_permission (
      auth.uid (),
      'team.manage_roles',
      'team',
      context_id::UUID
    )
    WHEN 'base' THEN public.has_permission (
      auth.uid (),
      'base.manage_roles',
      'base',
      context_id::UUID
    )
    WHEN 'partner' THEN public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      context_id::UUID
    )
    ELSE FALSE
  END
);
