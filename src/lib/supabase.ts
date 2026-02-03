import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ztydjimkjcubxpelimcw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0eWRqaW1ramN1YnhwZWxpbWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjA4MDUsImV4cCI6MjA4NTA5NjgwNX0.qNLK9l7uSet-tPPJfan5M9OwRoGkbYDBT1YjbLCjLqg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Source {
  id: number
  name: string
  source_type: 'rss' | 'youtube_channel' | 'website'
  url: string
  check_interval_minutes: number
  enabled: boolean
  aggregate: boolean
  auto_archive: boolean
  auto_approve: boolean
  auto_transcribe: boolean
  auto_summarize: boolean
  config: Record<string, unknown>
  last_checked_at: string | null
  created_at: string
  updated_at: string
  // Health tracking fields
  last_error: string | null
  last_error_at: string | null
  last_success_at: string | null
  consecutive_failures: number
  circuit_breaker_until: string | null
}

export interface ContentItemMetadata {
  // YouTube metadata
  channel?: string
  channel_id?: string
  duration?: number
  view_count?: number
  description?: string
  // RSS/Podcast metadata
  author?: string
  summary?: string
  enclosure_url?: string
  enclosure_type?: string
  image_url?: string  // Episode-specific artwork (podcast episode image)
}

export interface ContentItem {
  id: number
  source_id: number
  external_id: string | null
  url: string
  enclosure_url: string | null
  title: string | null
  content_type: 'video' | 'podcast' | 'article' | null
  status: 'pending' | 'archiving' | 'transcribing' | 'summarizing' | 'complete' | 'failed' | 'skipped'
  archive_path: string | null
  transcript_path: string | null
  summary: string | null
  error_message: string | null
  retry_count: number
  published_at: string | null
  discovered_at: string
  processed_at: string | null
  approved: boolean
  metadata_json: string | null
  sources?: Source
}

export interface Notification {
  id: number
  content_item_id: number | null
  notification_type: string
  status: string
  recipient: string | null
  subject: string | null
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export type SourceCreate = Omit<Source, 'id' | 'created_at' | 'updated_at' | 'last_checked_at' | 'last_error' | 'last_error_at' | 'last_success_at' | 'consecutive_failures' | 'circuit_breaker_until'>
export type SourceUpdate = Partial<SourceCreate>

export interface WorkerStatus {
  id: number
  worker_id: string
  last_heartbeat: string
  status: 'running' | 'idle' | 'stopping'
  hostname: string | null
  version: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
