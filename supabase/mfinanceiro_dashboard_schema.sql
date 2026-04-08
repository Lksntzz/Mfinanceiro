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
  saldo_restante numeric(12, 2) not null default 0,
  dias_restantes integer not null default 0,
  limite_diario numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.mf_finance_profiles enable row level security;
alter table public.mf_finance_expenses enable row level security;

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
