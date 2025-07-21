
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_downloads: {
        Row: {
          anon_user_id: string | null
          app_version: string
          created_at: string | null
          device_id: string
          id: string
          installed_at: string | null
          location: unknown | null
          os: string | null
          os_version: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          source_share_id: string | null
        }
        Insert: {
          anon_user_id?: string | null
          app_version: string
          created_at?: string | null
          device_id: string
          id?: string
          installed_at?: string | null
          location?: unknown | null
          os?: string | null
          os_version?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          source_share_id?: string | null
        }
        Update: {
          anon_user_id?: string | null
          app_version?: string
          created_at?: string | null
          device_id?: string
          id?: string
          installed_at?: string | null
          location?: unknown | null
          os?: string | null
          os_version?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          source_share_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_downloads_anon_user_id_fkey"
            columns: ["anon_user_id"]
            isOneToOne: false
            referencedRelation: "users_anon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_downloads_source_share_id_fkey"
            columns: ["source_share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      bases: {
        Row: {
          created_at: string | null
          id: string
          location: unknown | null
          name: string
          region_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: unknown | null
          name: string
          region_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: unknown | null
          name?: string
          region_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bases_teams: {
        Row: {
          base_id: string
          created_at: string | null
          id: string
          role_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          base_id: string
          created_at?: string | null
          id?: string
          role_id: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          base_id?: string
          created_at?: string | null
          id?: string
          role_id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bases_teams_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_teams_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_versions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          structure_notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          structure_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          structure_notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          bible_version_id: string
          book_number: number
          created_at: string | null
          global_order: number | null
          id: string
          name: string
          testament: Database["public"]["Enums"]["testament"] | null
          updated_at: string | null
        }
        Insert: {
          bible_version_id: string
          book_number: number
          created_at?: string | null
          global_order?: number | null
          id: string
          name: string
          testament?: Database["public"]["Enums"]["testament"] | null
          updated_at?: string | null
        }
        Update: {
          bible_version_id?: string
          book_number?: number
          created_at?: string | null
          global_order?: number | null
          id?: string
          name?: string
          testament?: Database["public"]["Enums"]["testament"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_bible_version_id_fkey"
            columns: ["bible_version_id"]
            isOneToOne: false
            referencedRelation: "bible_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_listens: {
        Row: {
          anon_user_id: string
          chapter_id: string
          connectivity: Database["public"]["Enums"]["connectivity_type"] | null
          created_at: string | null
          device_id: string
          id: string
          language_entity_id: string
          listened_at: string | null
          location: unknown | null
          session_id: string
        }
        Insert: {
          anon_user_id: string
          chapter_id: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          created_at?: string | null
          device_id: string
          id?: string
          language_entity_id: string
          listened_at?: string | null
          location?: unknown | null
          session_id: string
        }
        Update: {
          anon_user_id?: string
          chapter_id?: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          created_at?: string | null
          device_id?: string
          id?: string
          language_entity_id?: string
          listened_at?: string | null
          location?: unknown | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_listens_anon_user_id_fkey"
            columns: ["anon_user_id"]
            isOneToOne: false
            referencedRelation: "users_anon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_listens_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_listens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          book_id: string
          chapter_number: number
          created_at: string | null
          global_order: number | null
          id: string
          total_verses: number
          updated_at: string | null
        }
        Insert: {
          book_id: string
          chapter_number: number
          created_at?: string | null
          global_order?: number | null
          id: string
          total_verses: number
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          chapter_number?: number
          created_at?: string | null
          global_order?: number | null
          id?: string
          total_verses?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      image_sets: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          remote_path: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          remote_path: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          remote_path?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          publish_status: Database["public"]["Enums"]["publish_status"]
          remote_path: string
          set_id: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          remote_path: string
          set_id?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          remote_path?: string
          set_id?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "image_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      language_aliases: {
        Row: {
          alias_name: string
          created_at: string | null
          deleted_at: string | null
          id: string
          language_entity_id: string
        }
        Insert: {
          alias_name: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id: string
        }
        Update: {
          alias_name?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_aliases_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      language_entities: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          level: Database["public"]["Enums"]["language_entity_level"]
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          level: Database["public"]["Enums"]["language_entity_level"]
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["language_entity_level"]
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      language_entities_regions: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          dominance_level: number | null
          id: string
          language_entity_id: string
          region_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          dominance_level?: number | null
          id?: string
          language_entity_id: string
          region_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          dominance_level?: number | null
          id?: string
          language_entity_id?: string
          region_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      language_entity_sources: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          external_id: string | null
          id: string
          is_external: boolean
          language_entity_id: string
          source: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          is_external?: boolean
          language_entity_id: string
          source: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          is_external?: boolean
          language_entity_id?: string
          source?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entity_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entity_sources_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      language_entity_versions: {
        Row: {
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at: string | null
          changed_by: string
          id: string
          language_entity_id: string
          level: Database["public"]["Enums"]["language_entity_level"]
          name: string
          parent_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          version: number
        }
        Insert: {
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at?: string | null
          changed_by: string
          id?: string
          language_entity_id: string
          level: Database["public"]["Enums"]["language_entity_level"]
          name: string
          parent_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          version: number
        }
        Update: {
          change_type?: Database["public"]["Enums"]["change_type"]
          changed_at?: string | null
          changed_by?: string
          id?: string
          language_entity_id?: string
          level?: Database["public"]["Enums"]["language_entity_level"]
          name?: string
          parent_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "language_entity_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entity_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entity_versions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      language_properties: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          key: string
          language_entity_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key: string
          language_entity_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key?: string
          language_entity_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_properties_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      media_file_listens: {
        Row: {
          anon_user_id: string
          connectivity: Database["public"]["Enums"]["connectivity_type"] | null
          created_at: string | null
          device_id: string
          duration_seconds: number
          id: string
          language_entity_id: string
          listened_at: string | null
          location: unknown | null
          media_file_id: string
          position_seconds: number
          session_id: string
        }
        Insert: {
          anon_user_id: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          created_at?: string | null
          device_id: string
          duration_seconds: number
          id?: string
          language_entity_id: string
          listened_at?: string | null
          location?: unknown | null
          media_file_id: string
          position_seconds: number
          session_id: string
        }
        Update: {
          anon_user_id?: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          created_at?: string | null
          device_id?: string
          duration_seconds?: number
          id?: string
          language_entity_id?: string
          listened_at?: string | null
          location?: unknown | null
          media_file_id?: string
          position_seconds?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_file_listens_anon_user_id_fkey"
            columns: ["anon_user_id"]
            isOneToOne: false
            referencedRelation: "users_anon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_file_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_file_listens_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_file_listens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          check_status: Database["public"]["Enums"]["check_status"] | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          duration_seconds: number | null
          end_verse_id: string | null
          file_size: number | null
          id: string
          is_bible_audio: boolean | null
          language_entity_id: string
          local_path: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          project_id: string | null
          publish_status: Database["public"]["Enums"]["publish_status"] | null
          remote_path: string | null
          start_verse_id: string | null
          updated_at: string | null
          upload_status: Database["public"]["Enums"]["upload_status"] | null
          version: number | null
        }
        Insert: {
          check_status?: Database["public"]["Enums"]["check_status"] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          end_verse_id?: string | null
          file_size?: number | null
          id?: string
          is_bible_audio?: boolean | null
          language_entity_id: string
          local_path?: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          remote_path?: string | null
          start_verse_id?: string | null
          updated_at?: string | null
          upload_status?: Database["public"]["Enums"]["upload_status"] | null
          version?: number | null
        }
        Update: {
          check_status?: Database["public"]["Enums"]["check_status"] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          end_verse_id?: string | null
          file_size?: number | null
          id?: string
          is_bible_audio?: boolean | null
          language_entity_id?: string
          local_path?: string | null
          media_type?: Database["public"]["Enums"]["media_type"]
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          remote_path?: string | null
          start_verse_id?: string | null
          updated_at?: string | null
          upload_status?: Database["public"]["Enums"]["upload_status"] | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_end_verse_id_fkey"
            columns: ["end_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_start_verse_id_fkey"
            columns: ["start_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files_tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          media_file_id: string
          tag_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_file_id: string
          tag_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_file_id?: string
          tag_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_tags_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files_targets: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          media_file_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          media_file_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          media_file_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_targets_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files_verses: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          duration_seconds: number
          id: string
          media_file_id: string
          start_time_seconds: number
          updated_at: string | null
          verse_id: string
          verse_text_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds: number
          id?: string
          media_file_id: string
          start_time_seconds: number
          updated_at?: string | null
          verse_id: string
          verse_text_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number
          id?: string
          media_file_id?: string
          start_time_seconds?: number
          updated_at?: string | null
          verse_id?: string
          verse_text_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_verses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_verses_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_verses_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_verses_verse_text_id_fkey"
            columns: ["verse_text_id"]
            isOneToOne: false
            referencedRelation: "verse_texts"
            referencedColumns: ["id"]
          },
        ]
      }
      passages: {
        Row: {
          book_id: string
          created_at: string | null
          created_by: string | null
          end_verse_id: string
          id: string
          start_verse_id: string
          updated_at: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          created_by?: string | null
          end_verse_id: string
          id?: string
          start_verse_id: string
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          created_by?: string | null
          end_verse_id?: string
          id?: string
          start_verse_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_end_verse_id_fkey"
            columns: ["end_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_start_verse_id_fkey"
            columns: ["start_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          allow_deny: boolean
          context_id: string | null
          context_type: string
          created_at: string | null
          description: string
          id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          allow_deny?: boolean
          context_id?: string | null
          context_type: string
          created_at?: string | null
          description: string
          id?: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          allow_deny?: boolean
          context_id?: string | null
          context_type?: string
          created_at?: string | null
          description?: string
          id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          order_index: number
          playlist_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_index: number
          playlist_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_index?: number
          playlist_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists_playlist_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          index: number
          playlist_group_id: string
          playlist_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          index: number
          playlist_group_id: string
          playlist_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          index?: number
          playlist_group_id?: string
          playlist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_playlist_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_playlist_groups_playlist_group_id_fkey"
            columns: ["playlist_group_id"]
            isOneToOne: false
            referencedRelation: "playlist_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_playlist_groups_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          location: unknown | null
          name: string
          region_id: string | null
          source_language_entity_id: string
          target_language_entity_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: unknown | null
          name: string
          region_id?: string | null
          source_language_entity_id: string
          target_language_entity_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: unknown | null
          name?: string
          region_id?: string | null
          source_language_entity_id?: string
          target_language_entity_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_language_entity_id_fkey"
            columns: ["source_language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_target_language_entity_id_fkey"
            columns: ["target_language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      region_aliases: {
        Row: {
          alias_name: string
          created_at: string | null
          deleted_at: string | null
          id: string
          region_id: string
        }
        Insert: {
          alias_name: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          region_id: string
        }
        Update: {
          alias_name?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_aliases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      region_properties: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          key: string
          region_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key: string
          region_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key?: string
          region_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_properties_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      region_sources: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          external_id: string | null
          id: string
          is_external: boolean
          region_id: string
          source: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          is_external?: boolean
          region_id: string
          source: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          is_external?: boolean
          region_id?: string
          source?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "region_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_sources_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      region_versions: {
        Row: {
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at: string | null
          changed_by: string
          id: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id: string | null
          region_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          version: number
        }
        Insert: {
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at?: string | null
          changed_by: string
          id?: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id?: string | null
          region_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          version: number
        }
        Update: {
          change_type?: Database["public"]["Enums"]["change_type"]
          changed_at?: string | null
          changed_by?: string
          id?: string
          level?: Database["public"]["Enums"]["region_level"]
          name?: string
          parent_id?: string | null
          region_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "region_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_versions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_versions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          boundary: unknown | null
          created_at: string | null
          deleted_at: string | null
          id: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          boundary?: unknown | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          boundary?: unknown | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["region_level"]
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          local_path: string | null
          remote_path: string | null
          type: Database["public"]["Enums"]["segment_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          local_path?: string | null
          remote_path?: string | null
          type: Database["public"]["Enums"]["segment_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          local_path?: string | null
          remote_path?: string | null
          type?: Database["public"]["Enums"]["segment_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      segments_targets: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          segment_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          segment_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          segment_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segments_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_targets_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          book_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_verse_id: string | null
          id: string
          is_bible_audio: boolean | null
          name: string
          project_id: string
          start_verse_id: string | null
          updated_at: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_verse_id?: string | null
          id?: string
          is_bible_audio?: boolean | null
          name: string
          project_id: string
          start_verse_id?: string | null
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_verse_id?: string | null
          id?: string
          is_bible_audio?: boolean | null
          name?: string
          project_id?: string
          start_verse_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequences_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_end_verse_id_fkey"
            columns: ["end_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_start_verse_id_fkey"
            columns: ["start_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences_segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_deleted: boolean | null
          is_numbered: boolean | null
          segment_color: string | null
          segment_id: string
          segment_index: number
          sequence_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean | null
          is_numbered?: boolean | null
          segment_color?: string | null
          segment_id: string
          segment_index: number
          sequence_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean | null
          is_numbered?: boolean | null
          segment_color?: string | null
          segment_id?: string
          segment_index?: number
          sequence_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequences_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_segments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_segments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences_tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          sequence_id: string
          tag_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          sequence_id: string
          tag_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          sequence_id?: string
          tag_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequences_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_tags_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences_targets: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          sequence_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          sequence_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          sequence_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequences_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_targets_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          anon_user_id: string
          app_version: string
          connectivity: Database["public"]["Enums"]["connectivity_type"] | null
          created_at: string | null
          device_id: string
          ended_at: string | null
          id: string
          location: unknown | null
          os: string | null
          os_version: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          started_at: string | null
        }
        Insert: {
          anon_user_id: string
          app_version: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          created_at?: string | null
          device_id: string
          ended_at?: string | null
          id?: string
          location?: unknown | null
          os?: string | null
          os_version?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          started_at?: string | null
        }
        Update: {
          anon_user_id?: string
          app_version?: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          created_at?: string | null
          device_id?: string
          ended_at?: string | null
          id?: string
          location?: unknown | null
          os?: string | null
          os_version?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_anon_user_id_fkey"
            columns: ["anon_user_id"]
            isOneToOne: false
            referencedRelation: "users_anon"
            referencedColumns: ["id"]
          },
        ]
      }
      share_opens: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          language_entity_id: string
          location: unknown | null
          opened_at: string | null
          opened_by_anon_user_id: string | null
          origin_share_id: string | null
          session_id: string | null
          share_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          language_entity_id: string
          location?: unknown | null
          opened_at?: string | null
          opened_by_anon_user_id?: string | null
          origin_share_id?: string | null
          session_id?: string | null
          share_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          language_entity_id?: string
          location?: unknown | null
          opened_at?: string | null
          opened_by_anon_user_id?: string | null
          origin_share_id?: string | null
          session_id?: string | null
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_opens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_opens_opened_by_anon_user_id_fkey"
            columns: ["opened_by_anon_user_id"]
            isOneToOne: false
            referencedRelation: "users_anon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_opens_origin_share_id_fkey"
            columns: ["origin_share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_opens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_opens_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          anon_user_id: string
          created_at: string | null
          device_id: string
          id: string
          language_entity_id: string
          location: unknown | null
          origin_share_id: string | null
          session_id: string
          share_entity_id: string
          share_entity_type: Database["public"]["Enums"]["share_entity_type"]
          shared_at: string | null
        }
        Insert: {
          anon_user_id: string
          created_at?: string | null
          device_id: string
          id?: string
          language_entity_id: string
          location?: unknown | null
          origin_share_id?: string | null
          session_id: string
          share_entity_id: string
          share_entity_type: Database["public"]["Enums"]["share_entity_type"]
          shared_at?: string | null
        }
        Update: {
          anon_user_id?: string
          created_at?: string | null
          device_id?: string
          id?: string
          language_entity_id?: string
          location?: unknown | null
          origin_share_id?: string | null
          session_id?: string
          share_entity_id?: string
          share_entity_type?: Database["public"]["Enums"]["share_entity_type"]
          shared_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shares_anon_user_id_fkey"
            columns: ["anon_user_id"]
            isOneToOne: false
            referencedRelation: "users_anon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_origin_share_id_fkey"
            columns: ["origin_share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      text_versions: {
        Row: {
          bible_version_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          language_entity_id: string
          name: string
          text_version_source:
            | Database["public"]["Enums"]["text_version_source"]
            | null
          updated_at: string | null
        }
        Insert: {
          bible_version_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id: string
          name: string
          text_version_source?:
            | Database["public"]["Enums"]["text_version_source"]
            | null
          updated_at?: string | null
        }
        Update: {
          bible_version_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id?: string
          name?: string
          text_version_source?:
            | Database["public"]["Enums"]["text_version_source"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "text_versions_bible_version_id_fkey"
            columns: ["bible_version_id"]
            isOneToOne: false
            referencedRelation: "bible_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "text_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "text_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmark_folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmark_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "user_bookmark_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmark_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmarks: {
        Row: {
          bookmark_folder_id: string | null
          color: string | null
          created_at: string | null
          id: string
          note: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bookmark_folder_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bookmark_folder_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_bookmark_folder_id_fkey"
            columns: ["bookmark_folder_id"]
            isOneToOne: false
            referencedRelation: "user_bookmark_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contributions: {
        Row: {
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at: string | null
          changed_by: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["contribution_status"]
          target_id: string
          target_table: string
          version: number
        }
        Insert: {
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at?: string | null
          changed_by: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          target_id: string
          target_table: string
          version?: number
        }
        Update: {
          change_type?: Database["public"]["Enums"]["change_type"]
          changed_at?: string | null
          changed_by?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          target_id?: string
          target_table?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_contributions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contributions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_texts: {
        Row: {
          created_at: string | null
          created_by: string
          formatting: Json | null
          id: string
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          formatting?: Json | null
          id?: string
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          formatting?: Json | null
          id?: string
          text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_texts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_positions: {
        Row: {
          bookmark_folder_id: string | null
          created_at: string | null
          id: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bookmark_folder_id?: string | null
          created_at?: string | null
          id?: string
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bookmark_folder_id?: string | null
          created_at?: string | null
          id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_positions_bookmark_folder_id_fkey"
            columns: ["bookmark_folder_id"]
            isOneToOne: false
            referencedRelation: "user_bookmark_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string | null
          id: string
          role_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          role_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          role_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_uid: string
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          auth_uid: string
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_uid?: string
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users_anon: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_anon_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_listens: {
        Row: {
          anon_user_id: string
          connectivity: Database["public"]["Enums"]["connectivity_type"] | null
          created_at: string | null
          device_id: string
          id: string
          language_entity_id: string
          listened_at: string | null
          location: unknown | null
          session_id: string
          verse_id: string
        }
        Insert: {
          anon_user_id: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          created_at?: string | null
          device_id: string
          id?: string
          language_entity_id: string
          listened_at?: string | null
          location?: unknown | null
          session_id: string
          verse_id: string
        }
        Update: {
          anon_user_id?: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          created_at?: string | null
          device_id?: string
          id?: string
          language_entity_id?: string
          listened_at?: string | null
          location?: unknown | null
          session_id?: string
          verse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verse_listens_anon_user_id_fkey"
            columns: ["anon_user_id"]
            isOneToOne: false
            referencedRelation: "users_anon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_listens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_listens_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_texts: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          project_id: string | null
          publish_status: Database["public"]["Enums"]["publish_status"]
          text_version_id: string | null
          updated_at: string | null
          verse_id: string
          verse_text: string
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          text_version_id?: string | null
          updated_at?: string | null
          verse_id: string
          verse_text: string
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          text_version_id?: string | null
          updated_at?: string | null
          verse_id?: string
          verse_text?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "verse_texts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_texts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_texts_text_version_id_fkey"
            columns: ["text_version_id"]
            isOneToOne: false
            referencedRelation: "text_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_texts_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      verses: {
        Row: {
          chapter_id: string
          created_at: string | null
          global_order: number | null
          id: string
          updated_at: string | null
          verse_number: number
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          global_order?: number | null
          id: string
          updated_at?: string | null
          verse_number: number
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          global_order?: number | null
          id?: string
          updated_at?: string | null
          verse_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "verses_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { oldname: string; newname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { tbl: unknown; col: string }
        Returns: unknown
      }
      _postgis_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_scripts_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_selectivity: {
        Args: { tbl: unknown; att_name: string; geom: unknown; mode?: string }
        Returns: number
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_bestsrid: {
        Args: { "": unknown }
        Returns: number
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_pointoutside: {
        Args: { "": unknown }
        Returns: unknown
      }
      _st_sortablehash: {
        Args: { geom: unknown }
        Returns: number
      }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          g1: unknown
          clip?: unknown
          tolerance?: number
          return_polygons?: boolean
        }
        Returns: unknown
      }
      _st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      addauth: {
        Args: { "": string }
        Returns: boolean
      }
      addgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              schema_name: string
              table_name: string
              column_name: string
              new_srid_in: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
          | {
              schema_name: string
              table_name: string
              column_name: string
              new_srid: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
          | {
              table_name: string
              column_name: string
              new_srid: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
        Returns: string
      }
      box: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box3d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3dtobox: {
        Args: { "": unknown }
        Returns: unknown
      }
      bytea: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      disablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dropgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              schema_name: string
              table_name: string
              column_name: string
            }
          | { schema_name: string; table_name: string; column_name: string }
          | { table_name: string; column_name: string }
        Returns: string
      }
      dropgeometrytable: {
        Args:
          | { catalog_name: string; schema_name: string; table_name: string }
          | { schema_name: string; table_name: string }
          | { table_name: string }
        Returns: string
      }
      enablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geography: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      geography_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geography_gist_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_gist_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_send: {
        Args: { "": unknown }
        Returns: string
      }
      geography_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geography_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry: {
        Args:
          | { "": string }
          | { "": string }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
        Returns: unknown
      }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_sortsupport_2d: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_hash: {
        Args: { "": unknown }
        Returns: number
      }
      geometry_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_send: {
        Args: { "": unknown }
        Returns: string
      }
      geometry_sortsupport: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_spgist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_3d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geometry_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometrytype: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      get_chapter_global_order: {
        Args: { chapter_text_id: string } | { chapter_uuid: string }
        Returns: number
      }
      get_language_entity_path: {
        Args: { entity_id: string }
        Returns: string
      }
      get_proj4_from_srid: {
        Args: { "": number }
        Returns: string
      }
      get_region_path: {
        Args: { region_id: string }
        Returns: string
      }
      get_verse_global_order: {
        Args: { verse_text_id: string } | { verse_uuid: string }
        Returns: number
      }
      gettransactionid: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      gidx_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gidx_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      json: {
        Args: { "": unknown }
        Returns: Json
      }
      jsonb: {
        Args: { "": unknown }
        Returns: Json
      }
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      path: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_asflatgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_geometry_clusterintersecting_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_clusterwithin_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_collect_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_makeline_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_polygonize_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      point: {
        Args: { "": unknown }
        Returns: unknown
      }
      polygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      populate_geometry_columns: {
        Args:
          | { tbl_oid: unknown; use_typmod?: boolean }
          | { use_typmod?: boolean }
        Returns: number
      }
      postgis_addbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_constraint_dims: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: string
      }
      postgis_dropbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_extensions_upgrade: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_full_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_geos_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_geos_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_getbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_hasbbox: {
        Args: { "": unknown }
        Returns: boolean
      }
      postgis_index_supportfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_lib_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_revision: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libjson_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_liblwgeom_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libprotobuf_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libxml_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_proj_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_installed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_released: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_svn_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_type_name: {
        Args: {
          geomname: string
          coord_dimension: number
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_typmod_dims: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_srid: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_type: {
        Args: { "": number }
        Returns: string
      }
      postgis_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_wagyu_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      refresh_all_global_orders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      spheroid_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      spheroid_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlength: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dperimeter: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle: {
        Args:
          | { line1: unknown; line2: unknown }
          | { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
        Returns: number
      }
      st_area: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_area2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_asbinary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_asewkt: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asgeojson: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; options?: number }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              r: Record<string, unknown>
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
            }
        Returns: string
      }
      st_asgml: {
        Args:
          | { "": string }
          | {
              geog: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              version: number
              geog: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
          | {
              version: number
              geom: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
        Returns: string
      }
      st_ashexewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_askml: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
          | { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
        Returns: string
      }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: {
        Args: { geom: unknown; format?: string }
        Returns: string
      }
      st_asmvtgeom: {
        Args: {
          geom: unknown
          bounds: unknown
          extent?: number
          buffer?: number
          clip_geom?: boolean
        }
        Returns: unknown
      }
      st_assvg: {
        Args:
          | { "": string }
          | { geog: unknown; rel?: number; maxdecimaldigits?: number }
          | { geom: unknown; rel?: number; maxdecimaldigits?: number }
        Returns: string
      }
      st_astext: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_astwkb: {
        Args:
          | {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_z?: number
              prec_m?: number
              with_sizes?: boolean
              with_boxes?: boolean
            }
          | {
              geom: unknown
              prec?: number
              prec_z?: number
              prec_m?: number
              with_sizes?: boolean
              with_boxes?: boolean
            }
        Returns: string
      }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_boundary: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_boundingdiagonal: {
        Args: { geom: unknown; fits?: boolean }
        Returns: unknown
      }
      st_buffer: {
        Args:
          | { geom: unknown; radius: number; options?: string }
          | { geom: unknown; radius: number; quadsegs: number }
        Returns: unknown
      }
      st_buildarea: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_centroid: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      st_cleangeometry: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_clipbybox2d: {
        Args: { geom: unknown; box: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_clusterintersecting: {
        Args: { "": unknown[] }
        Returns: unknown[]
      }
      st_collect: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collectionextract: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_collectionhomogenize: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_concavehull: {
        Args: {
          param_geom: unknown
          param_pctconvex: number
          param_allow_holes?: boolean
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_convexhull: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_coorddim: {
        Args: { geometry: unknown }
        Returns: number
      }
      st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_curvetoline: {
        Args: { geom: unknown; tol?: number; toltype?: number; flags?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { g1: unknown; tolerance?: number; flags?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_dimension: {
        Args: { "": unknown }
        Returns: number
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance: {
        Args:
          | { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_distancesphere: {
        Args:
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; radius: number }
        Returns: number
      }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dump: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumppoints: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumprings: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumpsegments: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_endpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_envelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_expand: {
        Args:
          | { box: unknown; dx: number; dy: number }
          | { box: unknown; dx: number; dy: number; dz?: number }
          | { geom: unknown; dx: number; dy: number; dz?: number; dm?: number }
        Returns: unknown
      }
      st_exteriorring: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_flipcoordinates: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force3d: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; zvalue?: number; mvalue?: number }
        Returns: unknown
      }
      st_forcecollection: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcecurve: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygonccw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygoncw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcerhr: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcesfs: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_generatepoints: {
        Args:
          | { area: unknown; npoints: number }
          | { area: unknown; npoints: number; seed: number }
        Returns: unknown
      }
      st_geogfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geogfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geographyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geohash: {
        Args:
          | { geog: unknown; maxchars?: number }
          | { geom: unknown; maxchars?: number }
        Returns: string
      }
      st_geomcollfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomcollfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometricmedian: {
        Args: {
          g: unknown
          tolerance?: number
          max_iter?: number
          fail_if_not_converged?: boolean
        }
        Returns: unknown
      }
      st_geometryfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometrytype: {
        Args: { "": unknown }
        Returns: string
      }
      st_geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromgeojson: {
        Args: { "": Json } | { "": Json } | { "": string }
        Returns: unknown
      }
      st_geomfromgml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromkml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfrommarc21: {
        Args: { marc21xml: string }
        Returns: unknown
      }
      st_geomfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromtwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_gmltosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_hasarc: {
        Args: { geometry: unknown }
        Returns: boolean
      }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { size: number; cell_i: number; cell_j: number; origin?: unknown }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { size: number; bounds: unknown }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_isclosed: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_iscollection: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isempty: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygonccw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygoncw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isring: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_issimple: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvalid: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvaliddetail: {
        Args: { geom: unknown; flags?: number }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
      }
      st_isvalidreason: {
        Args: { "": unknown }
        Returns: string
      }
      st_isvalidtrajectory: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_length: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_length2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_letters: {
        Args: { letters: string; font?: Json }
        Returns: unknown
      }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { txtin: string; nprecision?: number }
        Returns: unknown
      }
      st_linefrommultipoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_linefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linemerge: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linestringfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linetocurve: {
        Args: { geometry: unknown }
        Returns: unknown
      }
      st_locatealong: {
        Args: { geometry: unknown; measure: number; leftrightoffset?: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          geometry: unknown
          frommeasure: number
          tomeasure: number
          leftrightoffset?: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { geometry: unknown; fromelevation: number; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_m: {
        Args: { "": unknown }
        Returns: number
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makepolygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { "": unknown } | { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_maximuminscribedcircle: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_memsize: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_minimumboundingradius: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_minimumclearance: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumclearanceline: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_mlinefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mlinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multi: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_multilinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multilinestringfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_ndims: {
        Args: { "": unknown }
        Returns: number
      }
      st_node: {
        Args: { g: unknown }
        Returns: unknown
      }
      st_normalize: {
        Args: { geom: unknown }
        Returns: unknown
      }
      st_npoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_nrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numgeometries: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorring: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpatches: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_offsetcurve: {
        Args: { line: unknown; distance: number; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_orientedenvelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { "": unknown } | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_perimeter2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_pointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointm: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          mcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_pointonsurface: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_points: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
          mcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_polyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonize: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      st_project: {
        Args: { geog: unknown; distance: number; azimuth: number }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_x: number
          prec_y?: number
          prec_z?: number
          prec_m?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: string
      }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_reverse: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid: {
        Args: { geog: unknown; srid: number } | { geom: unknown; srid: number }
        Returns: unknown
      }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shiftlongitude: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; vertex_fraction: number; is_outer?: boolean }
        Returns: unknown
      }
      st_split: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_square: {
        Args: { size: number; cell_i: number; cell_j: number; origin?: unknown }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { size: number; bounds: unknown }
        Returns: Record<string, unknown>[]
      }
      st_srid: {
        Args: { geog: unknown } | { geom: unknown }
        Returns: number
      }
      st_startpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_subdivide: {
        Args: { geom: unknown; maxvertices?: number; gridsize?: number }
        Returns: unknown[]
      }
      st_summary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          zoom: number
          x: number
          y: number
          bounds?: unknown
          margin?: number
        }
        Returns: unknown
      }
      st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_transform: {
        Args:
          | { geom: unknown; from_proj: string; to_proj: string }
          | { geom: unknown; from_proj: string; to_srid: number }
          | { geom: unknown; to_proj: string }
        Returns: unknown
      }
      st_triangulatepolygon: {
        Args: { g1: unknown }
        Returns: unknown
      }
      st_union: {
        Args:
          | { "": unknown[] }
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; gridsize: number }
        Returns: unknown
      }
      st_voronoilines: {
        Args: { g1: unknown; tolerance?: number; extend_to?: unknown }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { g1: unknown; tolerance?: number; extend_to?: unknown }
        Returns: unknown
      }
      st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_wkbtosql: {
        Args: { wkb: string }
        Returns: unknown
      }
      st_wkttosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_wrapx: {
        Args: { geom: unknown; wrap: number; move: number }
        Returns: unknown
      }
      st_x: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmin: {
        Args: { "": unknown }
        Returns: number
      }
      st_y: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymax: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymin: {
        Args: { "": unknown }
        Returns: number
      }
      st_z: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmflag: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmin: {
        Args: { "": unknown }
        Returns: number
      }
      text: {
        Args: { "": unknown }
        Returns: string
      }
      unlockrows: {
        Args: { "": string }
        Returns: number
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          schema_name: string
          table_name: string
          column_name: string
          new_srid_in: number
        }
        Returns: string
      }
      validate_verse_range: {
        Args:
          | { start_verse_text_id: string; end_verse_text_id: string }
          | { start_verse_uuid: string; end_verse_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      change_type: "create" | "update" | "delete"
      check_status: "pending" | "approved" | "rejected" | "requires_review"
      connectivity_type: "wifi" | "cellular" | "offline" | "unknown"
      contribution_status: "approved" | "not_approved"
      language_entity_level: "family" | "language" | "dialect" | "mother_tongue"
      media_type: "audio" | "video"
      platform_type: "ios" | "android" | "web" | "desktop"
      publish_status: "pending" | "published" | "archived"
      region_level:
        | "continent"
        | "world_region"
        | "country"
        | "state"
        | "province"
        | "district"
        | "town"
        | "village"
      segment_type: "source" | "target"
      share_entity_type: "app" | "chapter" | "playlist" | "verse" | "passage"
      target_type:
        | "chapter"
        | "book"
        | "sermon"
        | "passage"
        | "verse"
        | "podcast"
        | "film_segment"
        | "audio_segment"
      testament: "old" | "new"
      text_version_source:
        | "official_translation"
        | "ai_transcription"
        | "user_submitted"
      upload_status: "pending" | "uploading" | "completed" | "failed"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      change_type: ["create", "update", "delete"],
      check_status: ["pending", "approved", "rejected", "requires_review"],
      connectivity_type: ["wifi", "cellular", "offline", "unknown"],
      contribution_status: ["approved", "not_approved"],
      language_entity_level: ["family", "language", "dialect", "mother_tongue"],
      media_type: ["audio", "video"],
      platform_type: ["ios", "android", "web", "desktop"],
      publish_status: ["pending", "published", "archived"],
      region_level: [
        "continent",
        "world_region",
        "country",
        "state",
        "province",
        "district",
        "town",
        "village",
      ],
      segment_type: ["source", "target"],
      share_entity_type: ["app", "chapter", "playlist", "verse", "passage"],
      target_type: [
        "chapter",
        "book",
        "sermon",
        "passage",
        "verse",
        "podcast",
        "film_segment",
        "audio_segment",
      ],
      testament: ["old", "new"],
      text_version_source: [
        "official_translation",
        "ai_transcription",
        "user_submitted",
      ],
      upload_status: ["pending", "uploading", "completed", "failed"],
    },
  },
} as const
