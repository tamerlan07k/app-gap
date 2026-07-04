-- Allow users to delete their own AI analyses
create policy "users_delete_own_analyses"
  on public.ai_analyses
  for delete
  using (auth.uid() = user_id);
