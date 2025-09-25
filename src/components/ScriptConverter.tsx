import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Sparkles, FileText, Upload, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface Speaker {
  id: string;
  name: string;
  images: string[];
}
const MediaStudio = () => {
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [selectedMusic, setSelectedMusic] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [generatedJson, setGeneratedJson] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Video rendering state
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderStatus, setRenderStatus] = useState<'submitting' | 'queued' | 'processing' | 'completed' | 'error'>('submitting');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [renderId, setRenderId] = useState<string>('');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loadingSpeakers, setLoadingSpeakers] = useState(true);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const {
    toast
  } = useToast();

  // Available background audio options
  const audioOptions = [{
    id: "ambient-theme-1",
    name: "Ambient Theme 1",
    url: "https://res.cloudinary.com/dklc9t647/video/upload/v1754258824/Audio_Hertz_-_World_War_Outerspace_ievkg9.mp3"
  }];

  // Fetch speakers from Supabase
  useEffect(() => {
    fetchSpeakers();
  }, []);
  const fetchSpeakers = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('speakers').select('*').order('created_at', {
        ascending: true
      });
      if (error) throw error;
      setSpeakers(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profiles.",
        variant: "destructive"
      });
    } finally {
      setLoadingSpeakers(false);
    }
  };

  // Random shuffle function (Fisher-Yates)
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const handleAudioUpload = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file",
        description: "Please upload a media file.",
        variant: "destructive"
      });
      return;
    }
    setIsProcessingAudio(true);
    try {
      // Upload to Supabase Storage
      const fileName = `audio_${Date.now()}_${file.name}`;
      const {
        data,
        error
      } = await supabase.storage.from('audio-files').upload(fileName, file);
      if (error) throw error;

      // Get public URL
      const {
        data: urlData
      } = supabase.storage.from('audio-files').getPublicUrl(fileName);
      setAudioUrl(urlData.publicUrl);
      setUploadedAudio(file);

      // Detect audio duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => {
        const duration = Math.ceil(audio.duration);
        setVideoDuration(duration.toString());
        URL.revokeObjectURL(audio.src);
        toast({
          title: "Media uploaded",
          description: `Duration detected: ${duration} seconds`
        });
      });
      audio.addEventListener('error', () => {
        toast({
          title: "Error",
          description: "Could not detect media duration.",
          variant: "destructive"
        });
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload media file.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAudio(false);
    }
  };
  const generateJson = () => {
    if (!selectedSpeaker) {
      toast({
        title: "Missing information",
        description: "Please select a profile.",
        variant: "destructive"
      });
      return;
    }
    if (!uploadedAudio) {
      toast({
        title: "Missing media",
        description: "Please upload a media file.",
        variant: "destructive"
      });
      return;
    }
    const duration = parseInt(videoDuration);
    if (isNaN(duration) || duration <= 0) {
      toast({
        title: "Invalid duration",
        description: "Please enter a valid positive number for duration.",
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);

    // Simulate API call
    setTimeout(() => {
      const speaker = speakers.find(s => s.id === selectedSpeaker);
      const availableImages = speaker?.images || [];
      if (availableImages.length === 0) {
        toast({
          title: "No content",
          description: "Selected profile has no content available.",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      // Calculate how many images we need (6 seconds per image)
      const imagesNeeded = Math.ceil(duration / 6);

      // Randomly select and cycle through images if needed
      const shuffledImages = shuffleArray(availableImages);
      const selectedImages: string[] = [];
      for (let i = 0; i < imagesNeeded; i++) {
        selectedImages.push(shuffledImages[i % shuffledImages.length]);
      }

      // Generate scenes with proper structure
      const scenes = selectedImages.map((imageUrl, index) => {
        const isLastImage = index === selectedImages.length - 1;
        const imageDuration = isLastImage ? duration % 6 === 0 ? 6 : duration % 6 : 6;
        return {
          elements: [{
            fit: "cover",
            duration: imageDuration,
            "pan-distance": 0.1,
            src: imageUrl,
            scale: {
              width: 1920,
              height: 1080
            },
            zoom: index % 2 === 0 ? 1 : -1,
            type: "image",
            pan: index % 2 === 0 ? "top" : "bottom"
          }]
        };
      });

      // Build root elements array
      const elements = [];

      // Conditionally add subtitles
      if (includeSubtitles) {
        elements.push({
          settings: {
            "outline-width": 6,
            "word-color": "#FFFF00",
            "shadow-offset": 4,
            "font-url": "https://drive.google.com/uc?export=download&id=1g7X2XRKM25IErbIyCBsAWu65O1Hv43Zh",
            "max-words-per-line": 4,
            "shadow-color": "#000000",
            style: "classic",
            "font-family": "Roboto",
            position: "bottom-center",
            "outline-color": "#000000",
            "line-color": "#FFFFFF"
          },
          model: "default",
          language: "en",
          type: "subtitles"
        });
      }

      // Add main voiceover audio
      elements.push(
        {
          volume: 2,
          duration: duration,
          type: "audio",
          trim: {
            end: duration
          },
          src: audioUrl || "https://res.cloudinary.com/dklc9t647/video/upload/v1754258824/Audio_Hertz_-_World_War_Outerspace_ievkg9.mp3",
          loop: 0
        }
      );

      // Add background music if selected
      if (selectedMusic) {
        elements.push({
          volume: 0.05,
          duration: duration,
          type: "audio",
          trim: {
            end: duration
          },
          src: selectedMusic,
          loop: 0
        });
      }

      const mockJson = {
        scenes: scenes,
        comment: "Pan & Zoom F1 scenes only – no text",
        resolution: "full-hd",
        quality: "high",
        draft: false,
        elements: elements
      };
      setGeneratedJson(JSON.stringify(mockJson, null, 2));
      setIsGenerating(false);
      toast({
        title: "Project Created",
        description: "Your media configuration has been successfully generated."
      });
    }, 1500);
  };
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedJson);
    toast({
      title: "Copied!",
      description: "Configuration has been copied to clipboard."
    });
  };
  const downloadJson = () => {
    const blob = new Blob([generatedJson], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${selectedSpeaker}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded!",
      description: "Project file has been downloaded."
    });
  };

  const startVideoRender = async () => {
    if (!generatedJson) {
      toast({
        title: "No JSON Available",
        description: "Please generate JSON configuration first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRenderingVideo(true);
      setRenderStatus('submitting');
      setRenderError('');
      setRenderProgress(0);

      // Parse the JSON and send to rendering API
      const jsonData = JSON.parse(generatedJson);
      
      const { data, error } = await supabase.functions.invoke('json2video-render', {
        body: { json: jsonData }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setRenderId(data.id);
      setRenderStatus(data.status);
      
      toast({
        title: "Video Rendering Started",
        description: "Your video is being processed. This may take a few minutes.",
      });

      // Start polling for status updates
      pollRenderStatus(data.id);

    } catch (error) {
      console.error('Error starting video render:', error);
      setRenderError(error instanceof Error ? error.message : 'Failed to start video rendering');
      setRenderStatus('error');
      setIsRenderingVideo(false);
      
      toast({
        title: "Rendering Failed",
        description: error instanceof Error ? error.message : 'Failed to start video rendering',
        variant: "destructive",
      });
    }
  };

  const pollRenderStatus = async (id: string) => {
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        
        console.log(`Polling attempt ${attempts} for render ID:`, id);
        
        const { data: statusData, error } = await supabase.functions.invoke('json2video-render', {
          body: { action: 'status', id }
        });

        if (error) {
          throw new Error(`Status check failed: ${error.message}`);
        }

        console.log('Status check response:', statusData);
        
        setRenderStatus(statusData.status);
        setRenderProgress(statusData.progress || 0);

        if (statusData.status === 'completed') {
          setVideoUrl(statusData.video_url);
          setIsRenderingVideo(false);
          
          toast({
            title: "Video Ready!",
            description: "Your video has been successfully rendered.",
          });
          return;
        }

        if (statusData.status === 'error') {
          setRenderError(statusData.error || 'Unknown rendering error');
          setIsRenderingVideo(false);
          
          toast({
            title: "Rendering Failed",
            description: statusData.error || 'Unknown rendering error',
            variant: "destructive",
          });
          return;
        }

        // Continue polling if still processing
        if (attempts < maxAttempts && (statusData.status === 'queued' || statusData.status === 'processing' || statusData.status === 'submitting')) {
          setTimeout(poll, 3000); // Poll every 3 seconds for better real-time feel
        } else if (attempts >= maxAttempts) {
          setRenderError('Rendering timeout - please try again');
          setRenderStatus('error');
          setIsRenderingVideo(false);
          
          toast({
            title: "Rendering Timeout",
            description: "Video rendering is taking longer than expected. Please try again.",
            variant: "destructive",
          });
        }

      } catch (error) {
        console.error('Error polling render status:', error);
        setRenderError(error instanceof Error ? error.message : 'Failed to check render status');
        setRenderStatus('error');
        setIsRenderingVideo(false);
        
        toast({
          title: "Status Check Failed",
          description: error instanceof Error ? error.message : 'Failed to check render status',
          variant: "destructive",
        });
      }
    };

    // Start polling immediately
    poll();
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = 'generated-video.mp4';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  return (
    // Media Studio Generator
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary-glow" />
              <span>Media Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="speaker">Select Profile</Label>
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker} disabled={loadingSpeakers}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingSpeakers ? "Loading profiles..." : "Choose a profile..."} />
                </SelectTrigger>
                <SelectContent>
                  {speakers.map(speaker => <SelectItem key={speaker.id} value={speaker.id}>
                      {speaker.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="music">Select Background Music</Label>
              <Select value={selectedMusic} onValueChange={setSelectedMusic}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose background audio..." />
                </SelectTrigger>
                <SelectContent>
                  {audioOptions.map(music => <SelectItem key={music.id} value={music.url}>
                      {music.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="subtitles">Include Subtitles</Label>
                <p className="text-sm text-muted-foreground">Add automatic subtitles to your video</p>
              </div>
              <Switch 
                id="subtitles"
                checked={includeSubtitles} 
                onCheckedChange={setIncludeSubtitles} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="audio-upload">Upload Voiceover</Label>
              <div className="flex items-center space-x-2">
                <Input id="audio-upload" type="file" accept="audio/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAudioUpload(file);
                }} disabled={isProcessingAudio} className="flex-1" />
                {isProcessingAudio && <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <User className="h-4 w-4 animate-pulse" />
                    <span>Processing...</span>
                  </div>}
              </div>
              {uploadedAudio && <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{uploadedAudio.name}</span>
                    <span className="text-muted-foreground">• {videoDuration}s</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Will use {videoDuration && !isNaN(parseInt(videoDuration)) && parseInt(videoDuration) > 0 ? Math.ceil(parseInt(videoDuration) / 6) : 0} elements.
                  </p>
                </div>}
            </div>
            
            <Button onClick={generateJson} disabled={isGenerating} className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300">
              {isGenerating ? "Creating..." : "Create Project"}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Project Output</span>
              {generatedJson && <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadJson}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatedJson ? (
              <div className="space-y-4">
                <pre className="bg-code-bg text-code-foreground p-4 rounded-lg overflow-auto max-h-[400px] text-sm">
                  {generatedJson}
                </pre>
                <div className="flex gap-2">
                  <Button
                    onClick={downloadJson}
                    variant="secondary"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                  <Button
                    onClick={startVideoRender}
                    disabled={isRenderingVideo || !generatedJson}
                    className="bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    {isRenderingVideo ? 'Rendering...' : 'Generate Video'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/50 p-8 rounded-lg text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your project configuration will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Video Rendering Status */}
      {isRenderingVideo && (
        <Card className="shadow-elegant mt-8">
          <CardHeader>
            <CardTitle>Video Rendering Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-primary animate-pulse"></div>
                <span className="text-sm font-medium">
                  {renderStatus === 'submitting' && 'Submitting to render queue...'}
                  {renderStatus === 'queued' && 'Queued for processing...'}
                  {renderStatus === 'processing' && `Processing video... ${renderProgress}%`}
                </span>
              </div>
              
              {renderStatus === 'processing' && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${renderProgress}%` }}
                  ></div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                This process may take a few minutes depending on video complexity.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Result */}
      {renderStatus === 'completed' && videoUrl && (
        <Card className="shadow-elegant mt-8">
          <CardHeader>
            <CardTitle>Video Generated Successfully!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <video
                controls
                className="w-full max-w-2xl rounded-lg"
                src={videoUrl}
              >
                Your browser does not support the video tag.
              </video>
              
              <Button
                onClick={downloadVideo}
                className="bg-primary hover:bg-primary/90"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {renderStatus === 'error' && renderError && (
        <Card className="shadow-elegant mt-8 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Rendering Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-destructive/80">{renderError}</p>
              <Button
                onClick={() => {
                  setRenderStatus('submitting');
                  setRenderError('');
                  setIsRenderingVideo(false);
                }}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
export default MediaStudio;