import { supabase, type Source, type SourceCreate, type SourceUpdate } from '../lib/supabase'

export const sourcesApi = {
  // Get all sources
  async list(): Promise<Source[]> {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  },

  // Get single source
  async get(id: number): Promise<Source> {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create source
  async create(source: SourceCreate): Promise<Source> {
    const { data, error } = await supabase
      .from('sources')
      .insert(source)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update source
  async update(id: number, updates: SourceUpdate): Promise<Source> {
    const { data, error } = await supabase
      .from('sources')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete source
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Toggle enabled status
  async toggleEnabled(id: number, enabled: boolean): Promise<Source> {
    return this.update(id, { enabled })
  },

  // Toggle aggregate status
  async toggleAggregate(id: number, aggregate: boolean): Promise<Source> {
    return this.update(id, { aggregate })
  },

  // Bulk update a field on all sources
  async bulkUpdate(field: keyof SourceUpdate, value: boolean): Promise<void> {
    const { error } = await supabase
      .from('sources')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .neq('id', 0) // matches all rows

    if (error) throw error
  },
}
