/** Domain rows as returned by pREST (subset of columns the UI needs). */
export interface Session {
  id: string
  title?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface Topic {
  id: string
  title?: string | null
  session_id?: string | null
  created_at?: string
}

export interface ModelInfo {
  id: string
  name?: string
}
