revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.my_broker_ids() from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_broker_ids() to authenticated;