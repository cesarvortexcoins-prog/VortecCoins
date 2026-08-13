-- Permitir a usuarios anónimos (invitados) crear órdenes
-- Como los invitados no tienen auth.uid(), su user_id será NULL
CREATE POLICY "Anonimos crean órdenes" ON public.orders FOR INSERT WITH CHECK (user_id IS NULL AND auth.role() = 'anon');
