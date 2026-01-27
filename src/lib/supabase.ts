import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ztydjimkjcubxpelimcw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

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

export type SourceCreate = Omit<Source, 'id' | 'created_at' | 'updated_at' | 'last_checked_at'>
export type SourceUpdate = Partial<SourceCreate>
