-- Create speakers table
CREATE TABLE public.speakers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is content management)
CREATE POLICY "Anyone can view speakers" 
ON public.speakers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create speakers" 
ON public.speakers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update speakers" 
ON public.speakers 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete speakers" 
ON public.speakers 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_speakers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_speakers_updated_at
BEFORE UPDATE ON public.speakers
FOR EACH ROW
EXECUTE FUNCTION public.update_speakers_updated_at();