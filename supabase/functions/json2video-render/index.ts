import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface RenderRequest {
  json: any;
  webhook_url?: string;
}

interface RenderStatus {
  id: string;
  status: 'submitting' | 'queued' | 'processing' | 'completed' | 'error';
  progress?: number;
  message?: string;
  video_url?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // Handle both query parameter and body-based action detection
    let requestBody;
    let finalAction = action || 'render'; // Default to 'render' if no action specified
    let renderId = url.searchParams.get('id');
    
    if (req.method === 'POST') {
      try {
        requestBody = await req.json();
        
        // If action is in body (from supabase.functions.invoke), use that
        if (requestBody.action) {
          finalAction = requestBody.action;
          renderId = requestBody.id;
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
        // If JSON parsing fails, assume it's a render request
        finalAction = 'render';
      }
    }
    
    console.log('Request details:', { finalAction, renderId, hasBody: !!requestBody, method: req.method });
    
    if (finalAction === 'render') {
      // Start video rendering
      const jsonData = requestBody?.json || requestBody;
      const apiKey = requestBody?.apiKey || Deno.env.get('JSON2VIDEO_API_KEY');
      
      if (!apiKey) {
        throw new Error('JSON2Video API key is required');
      }
      
      console.log('Starting video render with JSON:', JSON.stringify(jsonData, null, 2));
      
      const response = await fetch('https://api.json2video.com/v2/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('JSON2Video API error:', errorText);
        throw new Error(`JSON2Video API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Render started:', data);

      return new Response(JSON.stringify({
        id: data.project, // JSON2Video returns the project ID
        status: 'submitting',
        message: 'Video render started'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (finalAction === 'status') {
      // Check rendering status
      if (!renderId) {
        throw new Error('Render ID is required for status check');
      }

      console.log('Checking status for render ID:', renderId);
      
      const apiKey = requestBody?.apiKey || Deno.env.get('JSON2VIDEO_API_KEY');
      if (!apiKey) {
        throw new Error('JSON2Video API key is required for status check');
      }

      const response = await fetch(`https://api.json2video.com/v2/movies?project=${renderId}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status check error:', errorText);
        throw new Error(`Status check failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Status response:', data);

      let status: RenderStatus = {
        id: renderId,
        status: 'processing'
      };

      // Map JSON2Video status to our status (using nested movie object)
      const movieData = data.movie || data;
      switch (movieData.status) {
        case 'queued':
          status.status = 'queued';
          status.message = 'Video is queued for processing';
          break;
        case 'processing':
          status.status = 'processing';
          status.progress = movieData.progress || 0;
          status.message = `Processing video... ${status.progress}%`;
          break;
        case 'done':
          status.status = 'completed';
          status.progress = 100;
          status.video_url = movieData.url;
          status.message = 'Video completed successfully!';
          break;
        case 'error':
          status.status = 'error';
          status.error = movieData.error || movieData.message || 'Unknown error occurred during rendering';
          break;
        default:
          status.status = 'processing';
          status.message = `Status: ${movieData.status}`;
      }

      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Invalid action: ${finalAction}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in json2video-render function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      status: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});