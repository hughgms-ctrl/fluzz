-- Função para processar convites automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.process_pending_invites()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite RECORD;
BEGIN
  -- Buscar convites pendentes para este email
  FOR _invite IN 
    SELECT * FROM workspace_invites 
    WHERE email = NEW.email 
    AND accepted = false 
    AND expires_at > now()
  LOOP
    -- Adicionar usuário ao workspace
    INSERT INTO workspace_members (
      workspace_id,
      user_id,
      role,
      invited_by
    ) VALUES (
      _invite.workspace_id,
      NEW.id,
      _invite.role,
      _invite.invited_by
    )
    ON CONFLICT (user_id, workspace_id) DO NOTHING;
    
    -- Criar permissões se não for admin
    IF _invite.role != 'admin' AND _invite.permissions IS NOT NULL THEN
      INSERT INTO user_permissions (
        workspace_id,
        user_id,
        can_view_projects,
        can_view_tasks,
        can_view_positions,
        can_view_analytics,
        can_view_briefings,
        can_view_culture,
        can_view_vision,
        can_view_processes
      ) VALUES (
        _invite.workspace_id,
        NEW.id,
        COALESCE((_invite.permissions->>'can_view_projects')::boolean, true),
        COALESCE((_invite.permissions->>'can_view_tasks')::boolean, true),
        COALESCE((_invite.permissions->>'can_view_positions')::boolean, true),
        COALESCE((_invite.permissions->>'can_view_analytics')::boolean, true),
        COALESCE((_invite.permissions->>'can_view_briefings')::boolean, true),
        COALESCE((_invite.permissions->>'can_view_culture')::boolean, true),
        COALESCE((_invite.permissions->>'can_view_vision')::boolean, true),
        COALESCE((_invite.permissions->>'can_view_processes')::boolean, true)
      )
      ON CONFLICT (user_id, workspace_id) DO NOTHING;
    END IF;
    
    -- Marcar convite como aceito
    UPDATE workspace_invites 
    SET accepted = true 
    WHERE id = _invite.id;
    
    -- Criar notificação de boas-vindas
    INSERT INTO notifications (
      user_id,
      workspace_id,
      type,
      title,
      message,
      link,
      data
    ) VALUES (
      NEW.id,
      _invite.workspace_id,
      'workspace_invite',
      'Bem-vindo ao workspace!',
      'Você foi adicionado ao workspace como ' || 
        CASE _invite.role
          WHEN 'admin' THEN 'Administrador'
          WHEN 'gestor' THEN 'Gestor'
          ELSE 'Membro'
        END || '.',
      '/',
      jsonb_build_object(
        'workspace_id', _invite.workspace_id,
        'role', _invite.role
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger que executa após inserção de novo usuário no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_process_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_process_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.process_pending_invites();