CREATE TYPE public.app_role AS ENUM ('organizer','attendee');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN NEW.raw_user_meta_data->>'account_type' = 'organizer' THEN 'organizer'::public.app_role ELSE 'attendee'::public.app_role END);
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.event_details (
  campaign_id text PRIMARY KEY,
  organizer_id uuid NOT NULL,
  venue text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Conference',
  price numeric(10,2) NOT NULL DEFAULT 0,
  capacity integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_details TO anon, authenticated;
GRANT INSERT, UPDATE ON public.event_details TO authenticated;
GRANT ALL ON public.event_details TO service_role;
ALTER TABLE public.event_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read events" ON public.event_details FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "organizer insert" ON public.event_details FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id AND public.has_role(auth.uid(),'organizer'));
CREATE POLICY "organizer update" ON public.event_details FOR UPDATE TO authenticated USING (auth.uid() = organizer_id);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id text NOT NULL,
  event_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  total numeric(10,2) NOT NULL,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  salesforce_opportunity_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "organizer sees orders" ON public.orders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.event_details d WHERE d.campaign_id = orders.campaign_id AND d.organizer_id = auth.uid()));

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);
GRANT SELECT ON public.feedback TO anon, authenticated;
GRANT INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read feedback" ON public.feedback FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ticket holders review" ON public.feedback FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = auth.uid() AND o.campaign_id = feedback.campaign_id));