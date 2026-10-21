
create type public.app_role as enum ('admin','moderator','user');
create type public.availability_status as enum ('disponivel','limitada','indisponivel');
create type public.request_status as enum ('pendente','respondido','aceito','concluido','cancelado');
create type public.price_type as enum ('fixo','inicial','hora','diaria','consulta');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  icon text not null default 'wrench',
  is_small_service boolean not null default false,
  sort_order int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  slug text unique not null,
  name text not null,
  business_name text,
  category_id uuid references public.categories(id),
  specialties text[] not null default '{}',
  bio text check (char_length(bio) <= 3000),
  city text not null default 'Gurupi - TO',
  regions text[] not null default '{}',
  avatar_url text,
  whatsapp text,
  instagram text,
  price_type price_type not null default 'consulta',
  price_value numeric(10,2),
  price_notes text,
  availability availability_status not null default 'disponivel',
  verified boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.professionals to anon, authenticated;
grant insert, update, delete on public.professionals to authenticated;
grant all on public.professionals to service_role;
alter table public.professionals enable row level security;
create policy "pros public read" on public.professionals for select to anon, authenticated using (published or auth.uid() = user_id);
create policy "pros own insert" on public.professionals for insert to authenticated with check (auth.uid() = user_id);
create policy "pros own update" on public.professionals for update to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "pros own delete" on public.professionals for delete to authenticated using (auth.uid() = user_id);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
grant select on public.portfolio_items to anon, authenticated;
grant insert, update, delete on public.portfolio_items to authenticated;
grant all on public.portfolio_items to service_role;
alter table public.portfolio_items enable row level security;
create policy "portfolio public" on public.portfolio_items for select to anon, authenticated using (true);
create policy "portfolio own write" on public.portfolio_items for all to authenticated
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));

create table public.availability_days (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  day date not null,
  status availability_status not null,
  unique (professional_id, day)
);
grant select on public.availability_days to anon, authenticated;
grant insert, update, delete on public.availability_days to authenticated;
grant all on public.availability_days to service_role;
alter table public.availability_days enable row level security;
create policy "avail public" on public.availability_days for select to anon, authenticated using (true);
create policy "avail own write" on public.availability_days for all to authenticated
  using (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  client_name text,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  description text not null,
  address text,
  preferred_date date,
  status request_status not null default 'pendente',
  pro_response text,
  quoted_value numeric(10,2),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.quote_requests to authenticated;
grant all on public.quote_requests to service_role;
alter table public.quote_requests enable row level security;
create policy "req parties read" on public.quote_requests for select to authenticated using (
  auth.uid() = client_id or exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy "req client insert" on public.quote_requests for insert to authenticated with check (auth.uid() = client_id);
create policy "req parties update" on public.quote_requests for update to authenticated using (
  auth.uid() = client_id or exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.quote_requests(id) on delete set null,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null,
  reviewer_name text not null default 'Cliente',
  rating int not null check (rating between 1 and 5),
  quality int check (quality between 1 and 5),
  punctuality int check (punctuality between 1 and 5),
  service int check (service between 1 and 5),
  price_transparency int check (price_transparency between 1 and 5),
  comment text,
  would_recommend boolean not null default true,
  pro_reply text,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert, update on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public" on public.reviews for select to anon, authenticated using (true);
create policy "reviews client insert" on public.reviews for insert to authenticated with check (
  auth.uid() = client_id and exists (select 1 from public.quote_requests r where r.id = request_id and r.client_id = auth.uid() and r.status = 'concluido' and r.professional_id = reviews.professional_id));
create policy "reviews pro reply" on public.reviews for update to authenticated using (
  exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));

create table public.favorites (
  user_id uuid not null,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, professional_id)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "fav own" on public.favorites for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  professional_id uuid references public.professionals(id) on delete cascade,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "report insert" on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "report admin read" on public.reports for select to authenticated using (public.has_role(auth.uid(),'admin') or auth.uid() = reporter_id);
create policy "report admin update" on public.reports for update to authenticated using (public.has_role(auth.uid(),'admin'));

create view public.professional_stats with (security_invoker = on) as
select p.id as professional_id,
  coalesce(round(avg(r.rating)::numeric,1),0) as avg_rating,
  count(r.id)::int as review_count
from public.professionals p left join public.reviews r on r.professional_id = p.id
group by p.id;
grant select on public.professional_stats to anon, authenticated;

insert into public.categories (slug,name,icon,is_small_service,sort_order) values
('eletrica','Elétrica','zap',false,1),
('hidraulica','Hidráulica','droplet',false,2),
('jardinagem','Jardinagem e quintal','sprout',false,3),
('limpeza','Limpeza e organização','sparkles',false,4),
('faz-tudo','Pequenos serviços e faz-tudo','hammer',true,5),
('pintura','Pintura','paintbrush',false,6),
('montagem','Montagem de móveis','sofa',true,7),
('outro','Outro serviço','circle-help',false,8);

insert into public.professionals (slug,name,business_name,category_id,specialties,bio,regions,whatsapp,instagram,price_type,price_value,price_notes,availability,verified) values
('joao-eletricista','João Batista','JB Elétrica',(select id from public.categories where slug='eletrica'),array['Chuveiros','Tomadas','Ventiladores'],'Eletricista há 15 anos em Gurupi. Atendo residências e comércios com pontualidade e limpeza. Trabalho com material de qualidade e explico tudo antes de começar.',array['Centro','Setor Sul','Jardim Tocantins'],'63999990001','jbeletrica','inicial',80,'Materiais à parte. Sem taxa de deslocamento no centro.','disponivel',true),
('maria-jardins','Maria Aparecida',null,(select id from public.categories where slug='jardinagem'),array['Corte de grama','Poda','Paisagismo'],'Cuido do seu jardim como se fosse meu. Corte de grama, poda de árvores pequenas e limpeza de quintal.',array['Setor Central','Vila Nova'],'63999990002',null,'diaria',150,'Levo as ferramentas.','limitada',true),
('carlos-faz-tudo','Carlos Henrique','Carlos Faz-Tudo',(select id from public.categories where slug='faz-tudo'),array['Montagem de móveis','Cortinas','Suporte de TV','Prateleiras'],'Resolvo aqueles pequenos consertos que ninguém quer fazer. Monto móveis, instalo cortinas, prateleiras e suportes de TV.',array['Todo Gurupi'],'63999990003','carlosfaztudo','fixo',60,'Valor por item simples.','disponivel',false),
('ana-limpeza','Ana Paula',null,(select id from public.categories where slug='limpeza'),array['Faxina','Organização','Pós-obra'],'Faxina completa e organização de ambientes. Pontual e caprichosa.',array['Centro','Setor Industrial'],'63999990004',null,'diaria',180,null,'indisponivel',true),
('pedro-hidraulica','Pedro Lima','Lima Hidráulica',(select id from public.categories where slug='hidraulica'),array['Vazamentos','Torneiras','Descargas'],'Hidráulica residencial com garantia de serviço. Atendimento rápido para vazamentos.',array['Setor Sul','Parque das Acácias'],'63999990005',null,'consulta',null,'Orçamento gratuito.','disponivel',true),
('lucas-pintor','Lucas Ferreira',null,(select id from public.categories where slug='pintura'),array['Pintura interna','Textura','Muros'],'Pintor com acabamento caprichado. Paredes, muros e texturas.',array['Todo Gurupi'],'63999990006','lucaspinturas','hora',45,'Tinta por conta do cliente.','limitada',false);

with r as (
  insert into public.quote_requests (client_id, client_name, professional_id, description, status)
  select gen_random_uuid(), x.n, (select id from public.professionals where slug=x.s), 'Serviço realizado', 'concluido'
  from (values ('joao-eletricista','Fernanda'),('joao-eletricista','Roberto'),('maria-jardins','Juliana'),('carlos-faz-tudo','Marcos'),('carlos-faz-tudo','Patrícia'),('pedro-hidraulica','Sandra'),('ana-limpeza','Cláudia'),('lucas-pintor','Diego')) as x(s,n)
  returning id, client_id, client_name, professional_id
)
insert into public.reviews (request_id, professional_id, client_id, reviewer_name, rating, quality, punctuality, service, price_transparency, comment)
select id, professional_id, client_id, client_name, 5, 5, 4, 5, 5, 'Excelente trabalho, muito educado e pontual. Recomendo!' from r;
