-- Create speakers_v2 table for v2 admin functionality
CREATE TABLE public.speakers_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}'::text[]
);

-- Enable Row Level Security
ALTER TABLE public.speakers_v2 ENABLE ROW LEVEL SECURITY;

-- Create policies for speakers_v2 (same as original speakers table)
CREATE POLICY "Anyone can view speakers v2" 
ON public.speakers_v2 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create speakers v2" 
ON public.speakers_v2 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update speakers v2" 
ON public.speakers_v2 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete speakers v2" 
ON public.speakers_v2 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_speakers_v2_updated_at
BEFORE UPDATE ON public.speakers_v2
FOR EACH ROW
EXECUTE FUNCTION public.update_speakers_updated_at();