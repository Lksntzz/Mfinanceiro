create extension if not exists pgcrypto;

create table if not exists public.mf_finance_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_data jsonb not null default '{}'::jsonb,
  banking_data jsonb not null default '{}'::jsonb,
  recebimentos_data jsonb not null default '{}'::jsonb,
  investimentos_data jsonb not null default '{}'::jsonb,
  saldo_inicial numeric(12, 2) not null default 0,
  proximo_pagamento_data date,
  proximo_pagamento_valor numeric(12, 2) not null default 0,
  valor_comprometido numeric(12, 2) not null default 0,
  saldo_disponivel numeric(12, 2) not null default 0,
  saldo_restante numeric(12, 2) not null default 0,
  dias_restantes integer not null default 0,
  limite_diario numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mf_finance_profiles
  add column if not exists valor_comprometido numeric(12, 2) not null default 0;

alter table public.mf_finance_profiles
  add column if not exists saldo_disponivel numeric(12, 2) not null default 0;

create table if not exists public.mf_finance_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  external_id text not null,
  descricao text not null,
  categoria text,
  valor numeric(12, 2) not null default 0,
  data date not null,
  tipo text not null default 'saida',
  origem text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mf_finance_expenses_user_external_id_key unique (user_id, external_id)
);

create table if not exists public.mf_finance_fixed_bills (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  valor numeric(12, 2) not null default 0,
  vencimento date not null,
  categoria text,
  recorrente boolean not null default false,
  status_pagamento text not null default 'pendente',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mf_finance_fixed_bills_user_id_key unique (user_id, id)
);

create table if not exists public.mf_finance_cards (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  limite numeric(12, 2) not null default 0,
  limite_usado numeric(12, 2) not null default 0,
  data_fechamento integer,
  data_vencimento integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mf_finance_cards_user_id_key unique (user_id, id)
);

create table if not exists public.mf_finance_card_expenses (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  cartao_id text not null,
  descricao text not null,
  valor numeric(12, 2) not null default 0,
  data date not null,
  categoria text,
  status_pagamento text not null default 'pendente',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mf_finance_card_expenses_user_id_key unique (user_id, id)
);

create table if not exists public.mf_finance_installments (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  valor_total numeric(12, 2) not null default 0,
  quantidade_parcelas integer not null default 1,
  valor_parcela numeric(12, 2) not null default 0,
  data_inicio date not null,
  vencimento integer not null,
  status text not null default 'ativo',
  tipo text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mf_finance_installments_user_id_key unique (user_id, id)
);

create table if not exists public.mf_finance_incomes (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null,
  descricao text not null,
  valor_previsto numeric(12, 2) not null default 0,
  valor_recebido numeric(12, 2) not null default 0,
  data_prevista date not null,
  status text not null default 'pendente',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mf_finance_incomes_user_id_key unique (user_id, id)
);

create table if not exists public.mf_finance_benefits (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null,
  valor numeric(12, 2) not null default 0,
  data_recebimento date not null,
  ativo boolean not null default true,
  contabilizar_no_saldo boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mf_finance_benefits_user_id_key unique (user_id, id)
);

alter table public.mf_finance_profiles enable row level security;
alter table public.mf_finance_expenses enable row level security;
alter table public.mf_finance_fixed_bills enable row level security;
alter table public.mf_finance_cards enable row level security;
alter table public.mf_finance_card_expenses enable row level security;
alter table public.mf_finance_installments enable row level security;
alter table public.mf_finance_incomes enable row level security;
alter table public.mf_finance_benefits enable row level security;

drop policy if exists "Users manage own finance profile" on public.mf_finance_profiles;
create policy "Users manage own finance profile"
  on public.mf_finance_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance expenses" on public.mf_finance_expenses;
create policy "Users manage own finance expenses"
  on public.mf_finance_expenses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance fixed bills" on public.mf_finance_fixed_bills;
create policy "Users manage own finance fixed bills"
  on public.mf_finance_fixed_bills
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance cards" on public.mf_finance_cards;
create policy "Users manage own finance cards"
  on public.mf_finance_cards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance card expenses" on public.mf_finance_card_expenses;
create policy "Users manage own finance card expenses"
  on public.mf_finance_card_expenses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance installments" on public.mf_finance_installments;
create policy "Users manage own finance installments"
  on public.mf_finance_installments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance incomes" on public.mf_finance_incomes;
create policy "Users manage own finance incomes"
  on public.mf_finance_incomes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own finance benefits" on public.mf_finance_benefits;
create policy "Users manage own finance benefits"
  on public.mf_finance_benefits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
