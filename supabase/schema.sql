-- ==============================================================================
-- CASA DIÁRIA - SCRIPT COMPLETO DE CRIAÇÃO DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase (https://supabase.com/dashboard)
-- Projeto: https://wnjevjbzgqiqtootttfo.supabase.co
-- ==============================================================================

-- 1. Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tipos enumerados (Enums)
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE availability_status AS ENUM ('disponivel', 'limitada', 'indisponivel');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE price_type AS ENUM ('fixo', 'inicial', 'hora', 'diaria', 'consulta');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('pendente', 'respondido', 'aceito', 'concluido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Tabelas Principais

-- Tabela de Perfis de Usuários (vinculada ao auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Categorias de Serviços
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'Wrench',
  sort_order INT NOT NULL DEFAULT 0,
  is_small_service BOOLEAN NOT NULL DEFAULT false
);

-- Tabela de Profissionais
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  business_name TEXT,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  whatsapp TEXT,
  city TEXT NOT NULL DEFAULT 'Gurupi - TO',
  bio TEXT,
  avatar_url TEXT,
  instagram TEXT,
  price_type price_type NOT NULL DEFAULT 'consulta',
  price_value NUMERIC,
  price_notes TEXT,
  availability availability_status NOT NULL DEFAULT 'disponivel',
  published BOOLEAN NOT NULL DEFAULT true,
  verified BOOLEAN NOT NULL DEFAULT false,
  regions TEXT[] NOT NULL DEFAULT '{"Gurupi"}',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Dias de Disponibilidade
CREATE TABLE IF NOT EXISTS public.availability_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  status availability_status NOT NULL DEFAULT 'disponivel'
);

-- Tabela de Favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, professional_id)
);

-- Tabela de Itens de Portfólio (Fotos dos trabalhos)
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Solicitações de Orçamento
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  address TEXT,
  preferred_date TEXT,
  status request_status NOT NULL DEFAULT 'pendente',
  pro_response TEXT,
  quoted_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.prevent_quote_request_participant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id
    OR NEW.professional_id IS DISTINCT FROM OLD.professional_id THEN
    RAISE EXCEPTION 'Os participantes de um pedido não podem ser alterados.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quote_request_participants_immutable ON public.quote_requests;
CREATE TRIGGER quote_request_participants_immutable
  BEFORE UPDATE OF client_id, professional_id ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.prevent_quote_request_participant_change();

-- Mensagens privadas vinculadas a uma solicitação de orçamento
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (
    char_length(body) BETWEEN 1 AND 4000 AND length(btrim(body)) > 0
  ),
  location_latitude DOUBLE PRECISION,
  location_longitude DOUBLE PRECISION,
  location_accuracy_meters DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_accuracy_meters DOUBLE PRECISION;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_location_coordinates_valid,
  ADD CONSTRAINT messages_location_coordinates_valid CHECK (
    (
      location_latitude IS NULL
      AND location_longitude IS NULL
      AND location_accuracy_meters IS NULL
    )
    OR (
      location_latitude IS NOT NULL
      AND location_longitude IS NOT NULL
      AND location_latitude BETWEEN -90 AND 90
      AND location_longitude BETWEEN -180 AND 180
      AND (location_accuracy_meters IS NULL OR location_accuracy_meters >= 0)
    )
  );

CREATE INDEX IF NOT EXISTS messages_request_created_at_idx
  ON public.messages (request_id, created_at);

-- Tabela de Avaliações
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID UNIQUE REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL DEFAULT 'Cliente',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  pro_reply TEXT,
  quality INT,
  punctuality INT,
  price_transparency INT,
  service INT,
  would_recommend BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Denúncias
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Permissões/Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- 4. Views

-- View de estatísticas de avaliações dos profissionais
CREATE OR REPLACE VIEW public.professional_stats AS
SELECT
  p.id AS professional_id,
  COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
  COUNT(r.id)::int AS review_count
FROM public.professionals p
LEFT JOIN public.reviews r ON r.professional_id = p.id
GROUP BY p.id;

-- 5. Funções e Triggers

-- Função para checar permissão (role)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Trigger para criar perfil automaticamente no cadastro do usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Habilitar Row Level Security (RLS) e Políticas de Acesso

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "Perfis públicos para leitura" ON public.profiles;
CREATE POLICY "Perfis públicos para leitura" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil" ON public.profiles;
CREATE POLICY "Usuário atualiza o próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário insere o próprio perfil" ON public.profiles;
CREATE POLICY "Usuário insere o próprio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para categories
DROP POLICY IF EXISTS "Categorias públicas para leitura" ON public.categories;
CREATE POLICY "Categorias públicas para leitura" ON public.categories FOR SELECT USING (true);

-- Políticas para professionals
DROP POLICY IF EXISTS "Profissionais publicados públicos para leitura" ON public.professionals;
CREATE POLICY "Profissionais publicados públicos para leitura" ON public.professionals FOR SELECT USING (published = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário autenticado cadastra seu perfil profissional" ON public.professionals;
CREATE POLICY "Usuário autenticado cadastra seu perfil profissional" ON public.professionals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Profissional atualiza seu próprio perfil" ON public.professionals;
CREATE POLICY "Profissional atualiza seu próprio perfil" ON public.professionals FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para availability_days
DROP POLICY IF EXISTS "Disponibilidade pública para leitura" ON public.availability_days;
CREATE POLICY "Disponibilidade pública para leitura" ON public.availability_days FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profissional gerencia seus dias de disponibilidade" ON public.availability_days;
CREATE POLICY "Profissional gerencia seus dias de disponibilidade" ON public.availability_days FOR ALL USING (
  EXISTS (SELECT 1 FROM public.professionals WHERE id = availability_days.professional_id AND user_id = auth.uid())
);

-- Políticas para favorites
DROP POLICY IF EXISTS "Usuário vê seus favoritos" ON public.favorites;
CREATE POLICY "Usuário vê seus favoritos" ON public.favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário gerencia seus favoritos" ON public.favorites;
CREATE POLICY "Usuário gerencia seus favoritos" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Políticas para portfolio_items
DROP POLICY IF EXISTS "Portfólio público para leitura" ON public.portfolio_items;
CREATE POLICY "Portfólio público para leitura" ON public.portfolio_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profissional gerencia seu portfólio" ON public.portfolio_items;
CREATE POLICY "Profissional gerencia seu portfólio" ON public.portfolio_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.professionals WHERE id = portfolio_items.professional_id AND user_id = auth.uid())
);

-- Políticas para quote_requests
DROP POLICY IF EXISTS "Clientes e Profissionais veem suas solicitações" ON public.quote_requests;
CREATE POLICY "Clientes e Profissionais veem suas solicitações" ON public.quote_requests FOR SELECT USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM public.professionals WHERE id = quote_requests.professional_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Clientes criam pedidos de orçamento" ON public.quote_requests;
CREATE POLICY "Clientes criam pedidos de orçamento" ON public.quote_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Participantes atualizam pedidos de orçamento" ON public.quote_requests;
CREATE POLICY "Participantes atualizam pedidos de orçamento" ON public.quote_requests FOR UPDATE USING (
  auth.uid() = client_id OR
  EXISTS (SELECT 1 FROM public.professionals WHERE id = quote_requests.professional_id AND user_id = auth.uid())
);

-- Políticas para mensagens: somente os participantes do pedido podem ler e enviar
DROP POLICY IF EXISTS "Participantes veem mensagens do pedido" ON public.messages;
CREATE POLICY "Participantes veem mensagens do pedido" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.quote_requests q
    WHERE q.id = messages.request_id
      AND (
        q.client_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.professionals p
          WHERE p.id = q.professional_id AND p.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Participantes enviam mensagens no pedido" ON public.messages;
CREATE POLICY "Participantes enviam mensagens no pedido" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.quote_requests q
    WHERE q.id = messages.request_id
      AND (
        q.client_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.professionals p
          WHERE p.id = q.professional_id AND p.user_id = auth.uid()
        )
      )
  )
);

-- Políticas para reviews
DROP POLICY IF EXISTS "Avaliações públicas para leitura" ON public.reviews;
CREATE POLICY "Avaliações públicas para leitura" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Clientes criam avaliações" ON public.reviews;
CREATE POLICY "Clientes criam avaliações" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Profissional responde sua avaliação" ON public.reviews;
CREATE POLICY "Profissional responde sua avaliação" ON public.reviews FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.professionals WHERE id = reviews.professional_id AND user_id = auth.uid())
);

-- Políticas para reports
DROP POLICY IF EXISTS "Usuários autenticados criam denúncias" ON public.reports;
CREATE POLICY "Usuários autenticados criam denúncias" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- 7. Storage Bucket (Media)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para o bucket 'media'
DROP POLICY IF EXISTS "Acesso público ao bucket media" ON storage.objects;
CREATE POLICY "Acesso público ao bucket media" ON storage.objects FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Usuários autenticados fazem upload no media" ON storage.objects;
CREATE POLICY "Usuários autenticados fazem upload no media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "Usuários atualizam seus arquivos no media" ON storage.objects;
CREATE POLICY "Usuários atualizam seus arquivos no media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Usuários excluem seus arquivos no media" ON storage.objects;
CREATE POLICY "Usuários excluem seus arquivos no media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. Dados Iniciais (Categorias de Gurupi-TO)
INSERT INTO public.categories (name, slug, icon, sort_order, is_small_service) VALUES
  ('Elétrica', 'eletrica', 'Zap', 1, false),
  ('Hidráulica', 'hidraulica', 'Droplet', 2, false),
  ('Jardinagem', 'jardinagem', 'Flower2', 3, false),
  ('Pintura', 'pintura', 'Paintbrush', 4, false),
  ('Limpeza e Diarista', 'limpeza', 'Sparkles', 5, false),
  ('Montagem de Móveis', 'montagem-moveis', 'Hammer', 6, true),
  ('Faz-Tudo / Pequenos Reparos', 'faz-tudo', 'Wrench', 7, true),
  ('Climatização e Ar-Condicionado', 'climatizacao', 'Wind', 8, false),
  ('Pedreiro e Reformas', 'reformas', 'HardHat', 9, false),
  ('Chaveiro', 'chaveiro', 'Key', 10, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_small_service = EXCLUDED.is_small_service;

-- Profissionais de Exemplo Iniciais para Gurupi-TO
INSERT INTO public.professionals (
  name,
  business_name,
  slug,
  category_id,
  whatsapp,
  city,
  bio,
  price_type,
  price_value,
  availability,
  published,
  verified,
  specialties,
  regions
) VALUES
  (
    'Carlos Silva',
    'Carlos Faz-Tudo & Reparos',
    'carlos-faz-tudo-gurupi',
    (SELECT id FROM public.categories WHERE slug = 'faz-tudo' LIMIT 1),
    '63999991234',
    'Gurupi - TO',
    'Especialista em pequenos reparos elétricos, hidráulicos e montagem de móveis em toda Gurupi.',
    'hora',
    60,
    'disponivel',
    true,
    true,
    ARRAY['Instalação de tomadas', 'Torneiras e sifões', 'Prateleiras', 'Varal de teto'],
    ARRAY['Centro', 'Setor União', 'Waldir Lins', 'Vila Nova']
  ),
  (
    'Mariana Santos',
    'Mariana Limpeza Residencial',
    'mariana-limpeza-residencial',
    (SELECT id FROM public.categories WHERE slug = 'limpeza' LIMIT 1),
    '63988884321',
    'Gurupi - TO',
    'Diarista profissional com mais de 5 anos de experiência em limpezas completas e pós-obra.',
    'diaria',
    150,
    'disponivel',
    true,
    true,
    ARRAY['Limpeza pesada', 'Limpeza pós-obra', 'Passadoria de roupas'],
    ARRAY['Toda Gurupi']
  ),
  (
    'Roberto Eletricista',
    'Roberto Elétrica Residencial',
    'roberto-eletrica-residencial',
    (SELECT id FROM public.categories WHERE slug = 'eletrica' LIMIT 1),
    '63991235566',
    'Gurupi - TO',
    'Eletricista predial e residencial com certificação NR10. Instalações e manutenção preventiva.',
    'consulta',
    NULL,
    'disponivel',
    true,
    true,
    ARRAY['Troca de fiação', 'Padrão Celg/Energisa', 'Quadro de disjuntores', 'Iluminação LED'],
    ARRAY['Gurupi e região']
  )
ON CONFLICT (slug) DO NOTHING;
