CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: check_project_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_project_completion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
BEGIN
  -- Count total and completed tasks for the project
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM public.tasks
  WHERE project_id = NEW.project_id;

  -- If all tasks are completed, mark project as completed
  IF total_tasks > 0 AND total_tasks = completed_tasks THEN
    UPDATE public.projects
    SET status = 'completed'
    WHERE id = NEW.project_id;
  ELSIF total_tasks > completed_tasks THEN
    -- If any task is not completed, revert project to active
    UPDATE public.projects
    SET status = 'active'
    WHERE id = NEW.project_id AND status = 'completed';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: is_project_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_project_owner(_user_id uuid, _project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND user_id = _user_id
  )
$$;


SET default_table_access_method = heap;

--
-- Name: company_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_info (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    mission text,
    vision text,
    "values" text
);


--
-- Name: company_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: process_documentation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_documentation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    area text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    objective text,
    responsible text,
    steps text,
    tools text,
    checklist text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    invited_by uuid NOT NULL,
    accepted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text])))
);


--
-- Name: subtasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subtasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    title text NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text,
    priority text DEFAULT 'medium'::text,
    due_date date,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_verified boolean DEFAULT false,
    documentation text,
    process_id uuid,
    setor text,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: company_info company_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_pkey PRIMARY KEY (id);


--
-- Name: company_info company_info_section_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_info
    ADD CONSTRAINT company_info_section_key UNIQUE (section);


--
-- Name: company_news company_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_news
    ADD CONSTRAINT company_news_pkey PRIMARY KEY (id);


--
-- Name: process_documentation process_documentation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_documentation
    ADD CONSTRAINT process_documentation_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_invites project_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_invites
    ADD CONSTRAINT project_invites_pkey PRIMARY KEY (id);


--
-- Name: project_invites project_invites_project_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_invites
    ADD CONSTRAINT project_invites_project_id_email_key UNIQUE (project_id, email);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: subtasks subtasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: idx_tasks_setor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_setor ON public.tasks USING btree (setor);


--
-- Name: tasks check_project_completion_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_project_completion_trigger AFTER INSERT OR UPDATE OF status ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.check_project_completion();


--
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: projects set_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: tasks set_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: company_info update_company_info_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_info_updated_at BEFORE UPDATE ON public.company_info FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: company_news update_company_news_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_news_updated_at BEFORE UPDATE ON public.company_news FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: process_documentation update_process_documentation_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_process_documentation_updated_at BEFORE UPDATE ON public.process_documentation FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: subtasks update_subtasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: company_news company_news_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_news
    ADD CONSTRAINT company_news_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: process_documentation process_documentation_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_documentation
    ADD CONSTRAINT process_documentation_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_invites project_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_invites
    ADD CONSTRAINT project_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: project_invites project_invites_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_invites
    ADD CONSTRAINT project_invites_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subtasks subtasks_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.process_documentation(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: company_info Anyone can view company info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view company info" ON public.company_info FOR SELECT TO authenticated USING (true);


--
-- Name: company_news Anyone can view news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view news" ON public.company_news FOR SELECT USING (true);


--
-- Name: process_documentation Anyone can view process documentation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view process documentation" ON public.process_documentation FOR SELECT TO authenticated USING (true);


--
-- Name: company_news Authenticated users can create news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create news" ON public.company_news FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: company_info Authenticated users can insert company info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert company info" ON public.company_info FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: company_info Authenticated users can update company info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update company info" ON public.company_info FOR UPDATE TO authenticated USING (true);


--
-- Name: project_invites Invited users can update their invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Invited users can update their invites" ON public.project_invites FOR UPDATE TO authenticated USING ((email IN ( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid()))));


--
-- Name: project_members Members can view other members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view other members" ON public.project_members FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: project_members Project owners can add members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can add members" ON public.project_members FOR INSERT WITH CHECK (public.is_project_owner(auth.uid(), project_id));


--
-- Name: project_invites Project owners can create invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can create invites" ON public.project_invites FOR INSERT TO authenticated WITH CHECK ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.user_id = auth.uid()))));


--
-- Name: project_invites Project owners can delete invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can delete invites" ON public.project_invites FOR DELETE TO authenticated USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.user_id = auth.uid()))));


--
-- Name: project_members Project owners can remove members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can remove members" ON public.project_members FOR DELETE USING (public.is_project_owner(auth.uid(), project_id));


--
-- Name: project_members Project owners can view members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can view members" ON public.project_members FOR SELECT USING (public.is_project_owner(auth.uid(), project_id));


--
-- Name: projects Users can create own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own projects" ON public.projects FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: subtasks Users can create subtasks in member projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create subtasks in member projects" ON public.subtasks FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (EXISTS ( SELECT 1
           FROM public.project_members
          WHERE ((project_members.project_id = tasks.project_id) AND (project_members.user_id = auth.uid())))))));


--
-- Name: subtasks Users can create subtasks in own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create subtasks in own projects" ON public.subtasks FOR INSERT WITH CHECK ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.project_id IN ( SELECT projects.id
           FROM public.projects
          WHERE (projects.user_id = auth.uid()))))));


--
-- Name: tasks Users can create tasks in member projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tasks in member projects" ON public.tasks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.project_members
  WHERE ((project_members.project_id = tasks.project_id) AND (project_members.user_id = auth.uid())))));


--
-- Name: tasks Users can create tasks in own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tasks in own projects" ON public.tasks FOR INSERT WITH CHECK ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.user_id = auth.uid()))));


--
-- Name: process_documentation Users can delete own process documentation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own process documentation" ON public.process_documentation FOR DELETE TO authenticated USING ((auth.uid() = created_by));


--
-- Name: projects Users can delete own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: subtasks Users can delete subtasks in member projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete subtasks in member projects" ON public.subtasks FOR DELETE USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (EXISTS ( SELECT 1
           FROM public.project_members
          WHERE ((project_members.project_id = tasks.project_id) AND (project_members.user_id = auth.uid())))))));


--
-- Name: subtasks Users can delete subtasks in own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete subtasks in own projects" ON public.subtasks FOR DELETE USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.project_id IN ( SELECT projects.id
           FROM public.projects
          WHERE (projects.user_id = auth.uid()))))));


--
-- Name: tasks Users can delete tasks in member projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete tasks in member projects" ON public.tasks FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.project_members
  WHERE ((project_members.project_id = tasks.project_id) AND (project_members.user_id = auth.uid())))));


--
-- Name: tasks Users can delete tasks in own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete tasks in own projects" ON public.tasks FOR DELETE USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.user_id = auth.uid()))));


--
-- Name: company_news Users can delete their own news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own news" ON public.company_news FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: process_documentation Users can insert process documentation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert process documentation" ON public.process_documentation FOR INSERT TO authenticated WITH CHECK ((auth.uid() = created_by));


--
-- Name: process_documentation Users can update own process documentation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own process documentation" ON public.process_documentation FOR UPDATE TO authenticated USING ((auth.uid() = created_by));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: projects Users can update own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: subtasks Users can update subtasks in member projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update subtasks in member projects" ON public.subtasks FOR UPDATE USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (EXISTS ( SELECT 1
           FROM public.project_members
          WHERE ((project_members.project_id = tasks.project_id) AND (project_members.user_id = auth.uid())))))));


--
-- Name: subtasks Users can update subtasks in own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update subtasks in own projects" ON public.subtasks FOR UPDATE USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.project_id IN ( SELECT projects.id
           FROM public.projects
          WHERE (projects.user_id = auth.uid()))))));


--
-- Name: tasks Users can update tasks in member projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update tasks in member projects" ON public.tasks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.project_members
  WHERE ((project_members.project_id = tasks.project_id) AND (project_members.user_id = auth.uid())))));


--
-- Name: tasks Users can update tasks in own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update tasks in own projects" ON public.tasks FOR UPDATE USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.user_id = auth.uid()))));


--
-- Name: company_news Users can update their own news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own news" ON public.company_news FOR UPDATE USING ((auth.uid() = created_by));


--
-- Name: project_invites Users can view invites for their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invites for their projects" ON public.project_invites FOR SELECT TO authenticated USING (((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.user_id = auth.uid()))) OR (email IN ( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: projects Users can view own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: projects Users can view projects they are members of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view projects they are members of" ON public.projects FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.project_members
  WHERE ((project_members.project_id = projects.id) AND (project_members.user_id = auth.uid())))));


--
-- Name: subtasks Users can view subtasks in member projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view subtasks in member projects" ON public.subtasks FOR SELECT USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (EXISTS ( SELECT 1
           FROM public.project_members
          WHERE ((project_members.project_id = tasks.project_id) AND (project_members.user_id = auth.uid())))))));


--
-- Name: subtasks Users can view subtasks in own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view subtasks in own projects" ON public.subtasks FOR SELECT USING ((task_id IN ( SELECT tasks.id
   FROM public.tasks
  WHERE (tasks.project_id IN ( SELECT projects.id
           FROM public.projects
          WHERE (projects.user_id = auth.uid()))))));


--
-- Name: tasks Users can view tasks in member projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks in member projects" ON public.tasks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.project_members
  WHERE ((project_members.project_id = tasks.project_id) AND (project_members.user_id = auth.uid())))));


--
-- Name: tasks Users can view tasks in own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks in own projects" ON public.tasks FOR SELECT USING ((project_id IN ( SELECT projects.id
   FROM public.projects
  WHERE (projects.user_id = auth.uid()))));


--
-- Name: company_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

--
-- Name: company_news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_news ENABLE ROW LEVEL SECURITY;

--
-- Name: process_documentation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.process_documentation ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: subtasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


