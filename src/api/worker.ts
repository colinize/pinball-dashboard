import { supabase } from '../lib/supabase'

export interface WorkerStatus {
  worker_id: string
  last_heartbeat: string
  status: 'running' | 'idle' | 'stopping'
  hostname: string | null
  version: string | null
  metadata: Record<string, unknown>
}

export type WorkerState = 'online' | 'idle' | 'offline' | 'unknown'

export interface WorkerStatusResult {
  state: WorkerState
  lastSeen: string | null
  worker: WorkerStatus | null
}

export const workerApi = {
  async getStatus(): Promise<WorkerStatusResult> {
    const { data, error } = await supabase
      .from('worker_status')
      .select('*')
      .order('last_heartbeat', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return { state: 'unknown', lastSeen: null, worker: null }
    }

    const now = new Date()
    const lastHeartbeat = new Date(data.last_heartbeat)
    const diffMinutes = (now.getTime() - lastHeartbeat.getTime()) / 60000

    let state: WorkerState
    if (diffMinutes < 5) {
      state = 'online'
    } else if (diffMinutes < 60) {
      state = 'idle'
    } else {
      state = 'offline'
    }

    return {
      state,
      lastSeen: data.last_heartbeat,
      worker: data as WorkerStatus,
    }
  },
}
