-- Allow product_id to be null in orders table for Special Offers
ALTER TABLE public.orders ALTER COLUMN product_id DROP NOT NULL;
