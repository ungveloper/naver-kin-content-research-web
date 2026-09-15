create extension if not exists pgcrypto;

create table if not exists public.content_articles (
  id uuid primary key default gen_random_uuid(),
  wordpress_url text not null unique,
  slug text not null unique,
  title text,
  status text not null default 'published'
    check (status in ('planned', 'published', 'archived')),
  intent_key text,
  notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kin_questions (
  id uuid primary key default gen_random_uuid(),
  kin_doc_id text not null unique,
  kin_url text not null unique,
  title text not null,
  normalized_title text not null,
  body text not null default '',
  intent_key text,
  duplicate_of_question_id uuid references public.kin_questions(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_article_relations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.kin_questions(id) on delete cascade,
  article_id uuid not null references public.content_articles(id) on delete cascade,
  relation_type text not null
    check (relation_type in ('origin', 'reuse', 'expand', 'duplicate')),
  confidence numeric(5,4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, article_id)
);

create index if not exists kin_questions_normalized_title_idx
  on public.kin_questions(normalized_title);

create index if not exists kin_questions_last_seen_at_idx
  on public.kin_questions(last_seen_at desc);

create index if not exists content_articles_status_idx
  on public.content_articles(status);

create index if not exists question_article_relations_article_id_idx
  on public.question_article_relations(article_id);

create or replace function public.set_content_registry_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_articles_updated_at on public.content_articles;
create trigger content_articles_updated_at
before update on public.content_articles
for each row execute function public.set_content_registry_updated_at();

drop trigger if exists kin_questions_updated_at on public.kin_questions;
create trigger kin_questions_updated_at
before update on public.kin_questions
for each row execute function public.set_content_registry_updated_at();

drop trigger if exists question_article_relations_updated_at
on public.question_article_relations;
create trigger question_article_relations_updated_at
before update on public.question_article_relations
for each row execute function public.set_content_registry_updated_at();

alter table public.content_articles enable row level security;
alter table public.kin_questions enable row level security;
alter table public.question_article_relations enable row level security;

create or replace view public.content_registry_entries
with (security_invoker = true)
as
select
  q.id as question_id,
  q.kin_doc_id,
  q.kin_url,
  q.title as question_title,
  q.normalized_title,
  q.body as question_body,
  q.intent_key as question_intent_key,
  a.id as article_id,
  a.wordpress_url,
  a.slug,
  a.title as article_title,
  a.status as article_status,
  a.intent_key as article_intent_key,
  r.relation_type,
  r.confidence,
  q.first_seen_at,
  q.last_seen_at
from public.kin_questions q
left join public.question_article_relations r
  on r.question_id = q.id
left join public.content_articles a
  on a.id = r.article_id;

comment on table public.content_articles is
  'WordPress 대표 콘텐츠 레지스트리. 여러 KIN 질문이 한 article에 연결될 수 있다.';

comment on table public.kin_questions is
  '수집한 네이버 지식iN 질문 레지스트리. exact duplicate와 향후 유사도 판단의 기준 데이터.';

comment on table public.question_article_relations is
  'KIN 질문과 WordPress 대표 글 관계: origin/reuse/expand/duplicate.';

comment on view public.content_registry_entries is
  '자동화가 duplicate/reuse 후보를 조회하기 위한 join view.';
