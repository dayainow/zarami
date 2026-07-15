CREATE POLICY "user_trees_delete_own"
  ON public.user_trees FOR DELETE
  USING (auth.uid() = user_id);
