-- N:N 組織モデル整合: organizations の UPDATE を organization_members 所属者に限定
-- （001 の organizations_update_policy が全 authenticated に開いている環境向け）

DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;

CREATE POLICY "organizations_update_by_members"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );
