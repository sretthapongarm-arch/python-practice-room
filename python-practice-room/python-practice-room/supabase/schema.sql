-- Python Practice Room — Supabase schema (MVP)
-- วางทั้งไฟล์ใน Supabase → SQL Editor แล้วกด Run

create extension if not exists "pgcrypto";

-- ───────────── ตาราง ─────────────

create table if not exists public.problems (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null,
  difficulty   text not null default 'easy' check (difficulty in ('easy', 'medium')),
  starter_code text not null default '',
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.test_cases (
  id              uuid primary key default gen_random_uuid(),
  problem_id      uuid not null references public.problems(id) on delete cascade,
  input           text not null default '',
  expected_output text not null,
  is_hidden       boolean not null default false,
  position        int  not null default 0
);
create index if not exists test_cases_problem_idx on public.test_cases(problem_id, position);

create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  problem_id   uuid not null references public.problems(id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 80),
  code         text not null check (char_length(code) <= 20000),
  passed_count int  not null default 0,
  total_count  int  not null default 0,
  status       text not null check (status in ('passed', 'failed')),
  created_at   timestamptz not null default now()
);
create index if not exists submissions_problem_idx on public.submissions(problem_id, created_at desc);

create table if not exists public.execution_results (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  test_case_id  uuid references public.test_cases(id) on delete set null,
  status        text not null check (status in ('passed', 'failed', 'error', 'timeout')),
  actual_output text,
  error_message text,
  runtime_ms    int
);
create index if not exists execution_results_submission_idx on public.execution_results(submission_id);

-- ───────────── Row Level Security ─────────────
-- นักเรียน = anon (ไม่ต้องล็อกอิน) อ่านโจทย์ได้ และส่งงานได้
-- ครู      = authenticated (ล็อกอินผ่าน Supabase Auth) ดูงานที่ส่งและจัดการโจทย์ได้

alter table public.problems          enable row level security;
alter table public.test_cases        enable row level security;
alter table public.submissions       enable row level security;
alter table public.execution_results enable row level security;

-- problems
create policy "anyone reads published problems" on public.problems
  for select to anon, authenticated using (is_published or auth.role() = 'authenticated');
create policy "teachers manage problems" on public.problems
  for all to authenticated using (true) with check (true);

-- test_cases
create policy "anyone reads test cases of published problems" on public.test_cases
  for select to anon, authenticated
  using (exists (select 1 from public.problems p where p.id = problem_id and (p.is_published or auth.role() = 'authenticated')));
create policy "teachers manage test cases" on public.test_cases
  for all to authenticated using (true) with check (true);

-- submissions: นักเรียนส่งได้อย่างเดียว ครูอ่านได้
create policy "anyone inserts submissions" on public.submissions
  for insert to anon, authenticated with check (true);
create policy "teachers read submissions" on public.submissions
  for select to authenticated using (true);

-- execution_results: เหมือนกัน
create policy "anyone inserts execution results" on public.execution_results
  for insert to anon, authenticated with check (true);
create policy "teachers read execution results" on public.execution_results
  for select to authenticated using (true);

-- ───────────── ข้อมูลตัวอย่าง ─────────────

with p1 as (
  insert into public.problems (title, description, difficulty, starter_code) values (
    'ทักทายชื่อ',
    E'อ่านชื่อ 1 บรรทัดจาก input แล้วพิมพ์ข้อความ "สวัสดี, <ชื่อ>!"\n\nตัวอย่าง\nInput: Somchai\nOutput: สวัสดี, Somchai!',
    'easy',
    E'name = input()\n# เขียนโค้ดต่อจากตรงนี้\n'
  ) returning id
)
insert into public.test_cases (problem_id, input, expected_output, is_hidden, position)
select id, 'Somchai', 'สวัสดี, Somchai!', false, 1 from p1
union all select id, 'Malee', 'สวัสดี, Malee!', false, 2 from p1
union all select id, 'Python', 'สวัสดี, Python!', true, 3 from p1;

with p2 as (
  insert into public.problems (title, description, difficulty, starter_code) values (
    'บวกเลขสองจำนวน',
    E'อ่านจำนวนเต็ม 2 ตัว (คนละบรรทัด) แล้วพิมพ์ผลบวก\n\nตัวอย่าง\nInput:\n3\n5\nOutput: 8',
    'easy',
    E'a = int(input())\nb = int(input())\n'
  ) returning id
)
insert into public.test_cases (problem_id, input, expected_output, is_hidden, position)
select id, E'3\n5', '8', false, 1 from p2
union all select id, E'-2\n7', '5', false, 2 from p2
union all select id, E'0\n0', '0', true, 3 from p2
union all select id, E'1000000\n2000000', '3000000', true, 4 from p2;

with p3 as (
  insert into public.problems (title, description, difficulty, starter_code) values (
    'นับเลขคู่',
    E'อ่านจำนวนเต็ม n แล้วพิมพ์จำนวนเลขคู่ในช่วง 1 ถึง n\n\nตัวอย่าง\nInput: 10\nOutput: 5',
    'medium',
    E'n = int(input())\n'
  ) returning id
)
insert into public.test_cases (problem_id, input, expected_output, is_hidden, position)
select id, '10', '5', false, 1 from p3
union all select id, '1', '0', false, 2 from p3
union all select id, '7', '3', true, 3 from p3
union all select id, '100', '50', true, 4 from p3;
