import { supabase, type ContentItem } from '../lib/supabase'

export interface ItemsFilter {
  status?: string
  source_id?: number
  content_type?: string
  limit?: number
  offset?: number
}

export interface ItemsResponse {
  items: ContentItem[]
  total: number
}

export const itemsApi = {
  // Get items with optional filters
  async list(filters: ItemsFilter = {}): Promise<ItemsResponse> {
    const { status, source_id, content_type, limit = 50, offset = 0 } = filters

    let query = supabase
      .from('content_items')
      .select('*, sources(name)', { count: 'exact' })
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (source_id) {
      query = query.eq('source_id', source_id)
    }
    if (content_type) {
      query = query.eq('content_type', content_type)
    }

    const { data, count, error } = await query

    if (error) throw error
    return { items: data || [], total: count || 0 }
  },

  // Get single item
  async get(id: number): Promise<ContentItem> {
    const { data, error } = await supabase
      .from('content_items')
      .select('*, sources(name)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Update item status
  async updateStatus(id: number, status: string): Promise<ContentItem> {
    const { data, error } = await supabase
      .from('content_items')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Skip item
  async skip(id: number): Promise<ContentItem> {
    return this.updateStatus(id, 'skipped')
  },

  // Requeue item
  async requeue(id: number): Promise<ContentItem> {
    const { data, error } = await supabase
      .from('content_items')
      .update({
        status: 'pending',
        error_message: null,
        retry_count: 0,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete item
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Get queue status counts
  async getQueueStatus(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('content_items')
      .select('status')

    if (error) throw error

    const counts: Record<string, number> = {}
    for (const item of data || []) {
      counts[item.status] = (counts[item.status] || 0) + 1
    }
    return counts
  },
}
