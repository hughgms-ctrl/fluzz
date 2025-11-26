export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      briefings: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          data: string
          id: string
          investimento_trafego: number
          local: string
          participantes_pagantes: number
          precos: Json
          project_id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          data: string
          id?: string
          investimento_trafego: number
          local: string
          participantes_pagantes: number
          precos: Json
          project_id: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          data?: string
          id?: string
          investimento_trafego?: number
          local?: string
          participantes_pagantes?: number
          precos?: Json
          project_id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_info: {
        Row: {
          content: string
          created_at: string | null
          id: string
          mission: string | null
          section: string
          title: string
          updated_at: string | null
          values: string | null
          vision: string | null
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          mission?: string | null
          section: string
          title: string
          updated_at?: string | null
          values?: string | null
          vision?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          mission?: string | null
          section?: string
          title?: string
          updated_at?: string | null
          values?: string | null
          vision?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_info_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_news: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_news_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      debriefing_vendedores: {
        Row: {
          created_at: string
          debriefing_id: string
          id: string
          leads_recebidos: number
          vendas_realizadas: number
          vendedor_nome: string
        }
        Insert: {
          created_at?: string
          debriefing_id: string
          id?: string
          leads_recebidos: number
          vendas_realizadas: number
          vendedor_nome: string
        }
        Update: {
          created_at?: string
          debriefing_id?: string
          id?: string
          leads_recebidos?: number
          vendas_realizadas?: number
          vendedor_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "debriefing_vendedores_debriefing_id_fkey"
            columns: ["debriefing_id"]
            isOneToOne: false
            referencedRelation: "debriefings"
            referencedColumns: ["id"]
          },
        ]
      }
      debriefings: {
        Row: {
          briefing_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          investimento_trafego: number
          leads: number
          mentorias_vendidas: number
          observacoes: string | null
          participantes_outras_estrategias: number
          project_id: string
          retorno_vendas_ingressos: number
          total_participantes: number
          updated_at: string
          valor_outras_estrategias: number
          valor_vendas_mentorias: number
          vendas_ingressos: number
          workspace_id: string | null
        }
        Insert: {
          briefing_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          investimento_trafego: number
          leads: number
          mentorias_vendidas: number
          observacoes?: string | null
          participantes_outras_estrategias: number
          project_id: string
          retorno_vendas_ingressos: number
          total_participantes: number
          updated_at?: string
          valor_outras_estrategias: number
          valor_vendas_mentorias: number
          vendas_ingressos: number
          workspace_id?: string | null
        }
        Update: {
          briefing_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          investimento_trafego?: number
          leads?: number
          mentorias_vendidas?: number
          observacoes?: string | null
          participantes_outras_estrategias?: number
          project_id?: string
          retorno_vendas_ingressos?: number
          total_participantes?: number
          updated_at?: string
          valor_outras_estrategias?: number
          valor_vendas_mentorias?: number
          vendas_ingressos?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debriefings_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debriefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debriefings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      process_documentation: {
        Row: {
          area: string
          checklist: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          objective: string | null
          responsible: string | null
          steps: string | null
          title: string
          tools: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          area: string
          checklist?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          objective?: string | null
          responsible?: string | null
          steps?: string | null
          title: string
          tools?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          area?: string
          checklist?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          objective?: string | null
          responsible?: string | null
          steps?: string | null
          title?: string
          tools?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_documentation_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_invites: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          email: string
          id: string
          invited_by: string
          project_id: string
          role: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          invited_by: string
          project_id: string
          role?: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived: boolean
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          position_id: string
          priority: string | null
          process_id: string | null
          project_id: string | null
          recurrence_config: Json | null
          recurrence_type: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          position_id: string
          priority?: string | null
          process_id?: string | null
          project_id?: string | null
          recurrence_config?: Json | null
          recurrence_type: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          position_id?: string
          priority?: string | null
          process_id?: string | null
          project_id?: string | null
          recurrence_config?: Json | null
          recurrence_type?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tasks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_tasks: {
        Row: {
          created_at: string
          description: string | null
          documentation: string | null
          id: string
          priority: string | null
          process_id: string | null
          project_id: string | null
          routine_id: string
          setor: string | null
          status: string | null
          task_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          documentation?: string | null
          id?: string
          priority?: string | null
          process_id?: string | null
          project_id?: string | null
          routine_id: string
          setor?: string | null
          status?: string | null
          task_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          documentation?: string | null
          id?: string
          priority?: string | null
          process_id?: string | null
          project_id?: string | null
          routine_id?: string
          setor?: string | null
          status?: string | null
          task_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_tasks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_tasks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          position_id: string
          recurrence_config: Json | null
          recurrence_type: string
          start_date: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          position_id: string
          recurrence_config?: Json | null
          recurrence_type: string
          start_date?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          position_id?: string
          recurrence_config?: Json | null
          recurrence_type?: string
          start_date?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routines_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_processes: {
        Row: {
          created_at: string | null
          id: string
          process_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          process_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          process_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_processes_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_processes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_verified: boolean | null
          created_at: string | null
          description: string | null
          documentation: string | null
          due_date: string | null
          id: string
          priority: string | null
          process_id: string | null
          project_id: string | null
          recurring_task_id: string | null
          routine_id: string | null
          setor: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_verified?: boolean | null
          created_at?: string | null
          description?: string | null
          documentation?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          process_id?: string | null
          project_id?: string | null
          recurring_task_id?: string | null
          routine_id?: string | null
          setor?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_verified?: boolean | null
          created_at?: string | null
          description?: string | null
          documentation?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          process_id?: string | null
          project_id?: string | null
          recurring_task_id?: string | null
          routine_id?: string | null
          setor?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "process_documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurring_task_id_fkey"
            columns: ["recurring_task_id"]
            isOneToOne: false
            referencedRelation: "recurring_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_positions: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          position_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          position_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          position_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_positions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_due_date: {
        Args: {
          _current_date: string
          _recurrence_config: Json
          _recurrence_type: string
        }
        Returns: string
      }
      get_user_workspace_id: { Args: { _user_id: string }; Returns: string }
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      user_belongs_to_workspace: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      user_is_admin_or_gestor: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      user_is_any_admin: { Args: { _user_id: string }; Returns: boolean }
      user_workspace_ids: {
        Args: { _user_id: string }
        Returns: {
          workspace_id: string
        }[]
      }
    }
    Enums: {
      workspace_role: "admin" | "gestor" | "membro"
    }
    CompositeTypes: {
      [_ in never]: never
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
  public: {
    Enums: {
      workspace_role: ["admin", "gestor", "membro"],
    },
  },
} as const
